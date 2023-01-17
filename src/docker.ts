/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 13:59:40
 * @FilePath      : /docker-build-push/src/docker.ts
 * @Description   : 
 * 
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved. 
 */
import cp from 'child_process';
import * as core from '@actions/core';
import * as github from './github';
import fs from 'fs';
import { context } from '@actions/github';
import { isGitHubTag, isBranch } from './github';
import { timestamp, cpOptions, sleep } from './utils';

const GITHUB_REGISTRY_URLS = ['docker.pkg.github.com', 'ghcr.io'];

export interface ImageBuildOption {
    /**
    * 是否跳过上传
    */
    skipPush?: boolean;
    /**
     * 是否自动生成latest标签
     */
    addLatest?: boolean;
    /**
     * 是否自动添加时间戳的标签
     */
    addTimestamp?: boolean;
    /**
     * 是否自动添加github tag的标签
     */
    addGithubTag?: boolean;
    /**
     * 镜像名称
     */
    imageName: string;
    /**
    * Dockerfile
    */
    dockerFile?: string;
    /**
     * buildDir
     */
    buildDir?: string;
    /**
     * tags
     */
    tags: string[];
    /**
     * args
     */
    buildArgs?: string[];
    /**
     * labels
     */
    labels?: string[];
    /**
     * target
     */
    target?: string;

    /**
    * target
    */
    platform?: string;

    /**
    * enableBuildKit
    */
    enableBuildKit?: boolean;
}

interface RegistryAuthencation {
    username: string;
    password: string;
}

interface RetryOption {
    maxRetryAttempts: number;
    retryDelaySeconds: number;
}

export class DockerService {
    /**
     * registry
     */
    public readonly registry: string;

    /**
     * authencation
     */
    private readonly authencation: RegistryAuthencation | undefined;

    /**
     * 出错重试配置
     */
    public retryOpt!: RetryOption;

    /**
     * retryLog
     */
    private retryLog = {
        loginRetryTimes: 0,
        pushRetryTimes: 0
    };


    /**
     * buildOpt
     * @param image 
     * @param githubOwner 
     * @returns 
     */
    public buildOpt!: ImageBuildOption;


    constructor(registry: string, auth?: RegistryAuthencation) {
        this.registry = registry;
        this.authencation = auth;
        this.buildOpt = {
            imageName: '',
            tags: [],
            buildArgs: undefined,
            labels: undefined,
            target: undefined,
            buildDir: undefined,
            enableBuildKit: false,
            platform: undefined,
            skipPush: false,
            addTimestamp: false,
            addLatest: false,
            addGithubTag: false,
            dockerFile: undefined
        };

        this.retryOpt = {
            retryDelaySeconds: 5,
            maxRetryAttempts: 5
        }
    }

    setBuildOption(opt: ImageBuildOption) {
        this.buildOpt = opt;
    }

    setRetryOption(opt: RetryOption) {
        this.retryOpt = opt;
    }


    isEcr(registry: string) {
        return registry && registry.includes('amazonaws');
    }

    getRegion(registry: string) {
        return registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));
    }

    /**
     * Create the full Docker image name with registry prefix (without tags) 
     * @returns `${registry}/${image}`;
     */
    createFullImageName(image: string) {
        if (GITHUB_REGISTRY_URLS.includes(this.registry)) {
            const githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
            return `${this.registry}/${githubOwner.toLowerCase()}/${image}`;
        }
        return `${this.registry}/${image}`;
    }


    /**
     * Create Docker tags based on input flags & Git branch 
     *
     */
    createTags() {
        core.info('Creating Docker image tags...');
        const { sha } = context;
        const ref = context.ref.toLowerCase();
        const shortSha = sha.substring(0, 7);
        const dockerTags: string[] = [];

        // 当未设置标签的时候尝试设置标签
        if (!this.buildOpt.tags || this.buildOpt.tags.length < 1 || this.buildOpt.addGithubTag) {
            if (isGitHubTag(ref)) {
                // If GitHub tag exists, use it as the Docker tag
                const tag = ref.replace('refs/tags/', '');
                dockerTags.push(tag);
            } else if (isBranch(ref)) {
                // If we're not building a tag, use branch-prefix-{GIT_SHORT_SHA) as the Docker tag
                // refs/heads/jira-123/feature/something
                const branchName = ref.replace('refs/heads/', '');
                const safeBranchName = branchName
                    .replace(/[^\w.-]+/g, '-')
                    .replace(/^[^\w]+/, '')
                    .substring(0, 120);
                const baseTag = `${safeBranchName}-${shortSha}`;
                const tag = this.buildOpt.addTimestamp ? `${baseTag}-${timestamp()}` : baseTag;
                dockerTags.push(tag);
            } else {
                throw new Error('Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push')
            }
        }

        if (this.buildOpt.addLatest) {
            dockerTags.push('latest');
        }

        core.info(`Docker tags created: ${dockerTags}`);
        this.buildOpt.tags = Array.from(new Set(this.buildOpt.tags.concat(dockerTags)));
        return dockerTags;
    }


    /**
     * Dynamically create 'docker build' command based on inputs provided
     */
    createBuildCommand() {
        const tagsSuffix = this.buildOpt.tags.map((tag: string) => `-t ${this.buildOpt.imageName}:${tag}`).join(' ');
        let buildCommandPrefix = `docker build -f ${this.buildOpt.dockerFile} ${tagsSuffix}`;

        if (this.buildOpt.buildArgs) {
            const argsSuffix = this.buildOpt.buildArgs.map((arg: string) => `--build-arg ${arg}`).join(' ');
            buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
        }

        if (this.buildOpt.labels) {
            const labelsSuffix = this.buildOpt.labels.map((label: string) => `--label ${label}`).join(' ');
            buildCommandPrefix = `${buildCommandPrefix} ${labelsSuffix}`;
        }

        if (this.buildOpt.target) {
            buildCommandPrefix = `${buildCommandPrefix} --target ${this.buildOpt.target}`;
        }

        if (this.buildOpt.platform) {
            buildCommandPrefix = `${buildCommandPrefix} --platform ${this.buildOpt.platform}`;
        }

        if (this.buildOpt.enableBuildKit) {
            buildCommandPrefix = `DOCKER_BUILDKIT=1 ${buildCommandPrefix}`;
        }

        return `${buildCommandPrefix} ${this.buildOpt.buildDir}`;
    }

    /**
     * buildImage
     * @param imageName 
     * @param dockerfile 
     * @param buildOpts 
     */
    async build() {
        if (!fs.existsSync(this.buildOpt.dockerFile || '')) {
            throw new Error(`Dockerfile does not exist in location ${this.buildOpt.dockerFile}`);
        }
        core.info(`Building Docker image ${this.buildOpt.imageName} with tags ${this.buildOpt.tags}...`);
        cp.execSync(this.createBuildCommand());
    }

    /**
     * Login to provided Docker registry 
     */
    async login(autoRetry: boolean = true) {
        if (this.buildOpt.skipPush) {
            core.info('Input skipPush is set to true, skipping Docker log in step...');
            return;
        }

        // If using ECR, use the AWS CLI login command in favor of docker login
        if (this.isEcr(this.registry)) {
            const region = this.getRegion(this.registry);
            core.info(`Logging into ECR region ${region}...`);
            cp.execSync(
                `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${this.registry}`
            );
        } else if (this.authencation && this.authencation.username && this.authencation.password) {
            core.info(`Logging into Docker registry ${this.registry}...`);
            try {

                const extOpt = this.retryLog.loginRetryTimes > 0 ? '--tls=false' : '';

                cp.execSync(`docker ${extOpt} login -u ${this.authencation.username} --password-stdin ${this.registry}`, {
                    input: this.authencation.password
                });
                core.info('Docker logined registry sucessfully...');
            } catch (error) {
                core.info(`Failed to Logging into Docker registry ${this.registry}: ${error}`);
                if (autoRetry && this.retryOpt.maxRetryAttempts > 0 && this.retryLog.loginRetryTimes < this.retryOpt.maxRetryAttempts) {
                    this.retryLog.loginRetryTimes++;
                    core.info(`Retry to Login into Docker registry: 第${this.retryLog.loginRetryTimes}次重试`);
                    await sleep(this.retryOpt.retryDelaySeconds * 1000);
                    await this.login();
                } else {
                    throw error;
                }
            }
        } else {
            throw new Error('Must supply Docker registry credentials to push image!');
        }
    }
    /**
     * Push Docker image & all tags
     */
    async push(autoRetry: boolean = true) {
        if (this.buildOpt.skipPush) {
            core.info('Input skipPush is set to true, skipping Docker push step...');
            return;
        }

        try {
            core.info(`Pushing tags ${this.buildOpt.tags} for Docker image ${this.buildOpt.imageName}...`);

            const extOpt = this.retryLog.loginRetryTimes > 0 || this.retryLog.pushRetryTimes > 0 ? '--tls=false' : '';

            cp.execSync(`docker ${extOpt} push ${this.buildOpt.imageName} --all-tags`);
        } catch (error) {
            core.info(`Failed to Pushing tags ${this.buildOpt.tags} for Docker image ${this.buildOpt.imageName}...: ${error}`);
            if (autoRetry && this.retryOpt.maxRetryAttempts > 0 && this.retryLog.pushRetryTimes < this.retryOpt.maxRetryAttempts) {

                if (this.retryLog.pushRetryTimes > 1) {
                    core.info(`多次尝试push失败，将进行登录尝试`)
                    await this.login(false);
                }

                this.retryLog.pushRetryTimes++;
                core.info(`Retry to Push tags ${this.buildOpt.tags} for Docker image : 第${this.retryLog.pushRetryTimes}次重试`);
                await sleep(this.retryOpt.retryDelaySeconds * 1000);
                await this.push();
            } else {
                throw error;
            }
        }
    }
}
