/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 11:11:36
 * @FilePath      : /docker-build-push/src/docker.ts
 * @Description   : 
 * 
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved. 
 */
import cp from 'child_process';
import * as core from '@actions/core';
import fs from 'fs';
import { context } from '@actions/github';
import { isGitHubTag, isBranch } from './github';
import { timestamp, cpOptions, sleep } from './utils';

const GITHUB_REGISTRY_URLS = ['docker.pkg.github.com', 'ghcr.io'];

/**
 * Create the full Docker image name with registry prefix (without tags) 
 * @returns `${registry}/${image}`;
 */
export const createFullImageName = (registry, image, githubOwner) => {
    if (GITHUB_REGISTRY_URLS.includes(registry)) {
        return `${registry}/${githubOwner.toLowerCase()}/${image}`;
    }
    return `${registry}/${image}`;
};

/**
 * Create Docker tags based on input flags & Git branch 
 *
 */
export const createTags = (addLatest: boolean, addTimestamp: boolean) => {
    core.info('Creating Docker image tags...');
    const { sha } = context;
    const ref = context.ref.toLowerCase();
    const shortSha = sha.substring(0, 7);
    const dockerTags: string[] = [];

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
        const tag = addTimestamp ? `${baseTag}-${timestamp()}` : baseTag;
        dockerTags.push(tag);
    } else {
        throw new Error('Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push')
    }

    if (addLatest) {
        dockerTags.push('latest');
    }

    core.info(`Docker tags created: ${dockerTags}`);
    return dockerTags;
};

/**
 * Dynamically create 'docker build' command based on inputs provided
 */
export const createBuildCommand = (imageName: string, dockerfile: string, buildOpts: any) => {
    const tagsSuffix = buildOpts.tags.map((tag: string) => `-t ${imageName}:${tag}`).join(' ');
    let buildCommandPrefix = `docker build -f ${dockerfile} ${tagsSuffix}`;

    if (buildOpts.buildArgs) {
        const argsSuffix = buildOpts.buildArgs.map((arg: string) => `--build-arg ${arg}`).join(' ');
        buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
    }

    if (buildOpts.labels) {
        const labelsSuffix = buildOpts.labels.map((label: string) => `--label ${label}`).join(' ');
        buildCommandPrefix = `${buildCommandPrefix} ${labelsSuffix}`;
    }

    if (buildOpts.target) {
        buildCommandPrefix = `${buildCommandPrefix} --target ${buildOpts.target}`;
    }

    if (buildOpts.platform) {
        buildCommandPrefix = `${buildCommandPrefix} --platform ${buildOpts.platform}`;
    }

    if (buildOpts.enableBuildKit) {
        buildCommandPrefix = `DOCKER_BUILDKIT=1 ${buildCommandPrefix}`;
    }

    return `${buildCommandPrefix} ${buildOpts.buildDir}`;
};

// Perform 'docker build' command
export const build = async (imageName: string, dockerfile: string, buildOpts: any) => {
    if (!fs.existsSync(dockerfile)) {
        throw new Error(`Dockerfile does not exist in location ${dockerfile}`);
    }

    core.info(`Building Docker image ${imageName} with tags ${buildOpts.tags}...`);
    cp.execSync(createBuildCommand(imageName, dockerfile, buildOpts));
};

export const isEcr = (registry: string) => registry && registry.includes('amazonaws');

export const getRegion = (registry: string) => registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));

// Log in to provided Docker registry
export const login = async (username: string, password: string, registry: string, skipPush: boolean, maxRetryAttempts: number = 1, retryDelaySeconds: number = 1) => {
    if (skipPush) {
        core.info('Input skipPush is set to true, skipping Docker log in step...');
        return;
    }

    // If using ECR, use the AWS CLI login command in favor of docker login
    if (isEcr(registry)) {
        const region = getRegion(registry);
        core.info(`Logging into ECR region ${region}...`);
        cp.execSync(
            `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registry}`
        );
    } else if (username && password) {
        core.info(`Logging into Docker registry ${registry}...`);
        try {
            cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
                input: password
            });
        } catch (error) {
            core.info(`Failed to Logging into Docker registry ${registry}: ${error}`);
            if (maxRetryAttempts > 0) {
                core.info(`Retry to Logging into Docker registry ${registry}...`);
                await sleep(retryDelaySeconds * 1000);
                await login(username, password, registry, skipPush, maxRetryAttempts - 1, retryDelaySeconds);
            } else {
                throw error;
            }
        }
    } else {
        throw new Error('Must supply Docker registry credentials to push image!');
    }
};

/**
 * Push Docker image & all tags
 */
export const push = async (imageName: string, tags: string, skipPush: boolean, maxRetryAttempts: number = 1, retryDelaySeconds: number = 1) => {
    if (skipPush) {
        core.info('Input skipPush is set to true, skipping Docker push step...');
        return;
    }

    try {
        core.info(`Pushing tags ${tags} for Docker image ${imageName}...`);
        cp.execSync(`docker push ${imageName} --all-tags`);
    } catch (error) {
        core.info(`Failed to Pushing tags ${tags} for Docker image ${imageName}...: ${error}`);
        if (maxRetryAttempts > 0) {
            core.info(`Retry to Pushing tags ${tags} for Docker image ${imageName}`);
            await sleep(retryDelaySeconds * 1000);
            await push(imageName, tags, skipPush, maxRetryAttempts - 1, retryDelaySeconds)
        } else {
            throw error;
        }
    }
};
