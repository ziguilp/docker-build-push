"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerService = void 0;
/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 12:44:13
 * @FilePath      : /docker-build-push/src/docker.ts
 * @Description   :
 *
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved.
 */
const child_process_1 = __importDefault(require("child_process"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("./github"));
const fs_1 = __importDefault(require("fs"));
const github_1 = require("@actions/github");
const github_2 = require("./github");
const utils_1 = require("./utils");
const GITHUB_REGISTRY_URLS = ['docker.pkg.github.com', 'ghcr.io'];
class DockerService {
    constructor(registry, auth) {
        /**
         * retryLog
         */
        this.retryLog = {
            loginRetryTimes: 0,
            pushRetryTimes: 0
        };
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
        };
    }
    setBuildOption(opt) {
        this.buildOpt = opt;
    }
    setRetryOption(opt) {
        this.retryOpt = opt;
    }
    isEcr(registry) {
        return registry && registry.includes('amazonaws');
    }
    getRegion(registry) {
        return registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));
    }
    /**
     * Create the full Docker image name with registry prefix (without tags)
     * @returns `${registry}/${image}`;
     */
    createFullImageName(image) {
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
        const { sha } = github_1.context;
        const ref = github_1.context.ref.toLowerCase();
        const shortSha = sha.substring(0, 7);
        const dockerTags = [];
        // 当未设置标签的时候尝试设置标签
        if (!this.buildOpt.tags || this.buildOpt.tags.length < 1 || this.buildOpt.addGithubTag) {
            if ((0, github_2.isGitHubTag)(ref)) {
                // If GitHub tag exists, use it as the Docker tag
                const tag = ref.replace('refs/tags/', '');
                dockerTags.push(tag);
            }
            else if ((0, github_2.isBranch)(ref)) {
                // If we're not building a tag, use branch-prefix-{GIT_SHORT_SHA) as the Docker tag
                // refs/heads/jira-123/feature/something
                const branchName = ref.replace('refs/heads/', '');
                const safeBranchName = branchName
                    .replace(/[^\w.-]+/g, '-')
                    .replace(/^[^\w]+/, '')
                    .substring(0, 120);
                const baseTag = `${safeBranchName}-${shortSha}`;
                const tag = this.buildOpt.addTimestamp ? `${baseTag}-${(0, utils_1.timestamp)()}` : baseTag;
                dockerTags.push(tag);
            }
            else {
                throw new Error('Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push');
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
        const tagsSuffix = this.buildOpt.tags.map((tag) => `-t ${this.buildOpt.imageName}:${tag}`).join(' ');
        let buildCommandPrefix = `docker build -f ${this.buildOpt.dockerFile} ${tagsSuffix}`;
        if (this.buildOpt.buildArgs) {
            const argsSuffix = this.buildOpt.buildArgs.map((arg) => `--build-arg ${arg}`).join(' ');
            buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
        }
        if (this.buildOpt.labels) {
            const labelsSuffix = this.buildOpt.labels.map((label) => `--label ${label}`).join(' ');
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
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs_1.default.existsSync(this.buildOpt.dockerFile || '')) {
                throw new Error(`Dockerfile does not exist in location ${this.buildOpt.dockerFile}`);
            }
            core.info(`Building Docker image ${this.buildOpt.imageName} with tags ${this.buildOpt.tags}...`);
            child_process_1.default.execSync(this.createBuildCommand());
        });
    }
    /**
     * Login to provided Docker registry
     */
    login(autoRetry = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.buildOpt.skipPush) {
                core.info('Input skipPush is set to true, skipping Docker log in step...');
                return;
            }
            // If using ECR, use the AWS CLI login command in favor of docker login
            if (this.isEcr(this.registry)) {
                const region = this.getRegion(this.registry);
                core.info(`Logging into ECR region ${region}...`);
                child_process_1.default.execSync(`aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${this.registry}`);
            }
            else if (this.authencation && this.authencation.username && this.authencation.password) {
                core.info(`Logging into Docker registry ${this.registry}...`);
                try {
                    child_process_1.default.execSync(`docker login -u ${this.authencation.username} --password-stdin ${this.registry}`, {
                        input: this.authencation.password
                    });
                    core.info('Docker logined registry sucessfully...');
                }
                catch (error) {
                    core.info(`Failed to Logging into Docker registry ${this.registry}: ${error}`);
                    if (autoRetry && this.retryOpt.maxRetryAttempts > 0 && this.retryLog.loginRetryTimes < this.retryOpt.maxRetryAttempts) {
                        this.retryLog.loginRetryTimes++;
                        core.info(`Retry to Login into Docker registry: 第${this.retryLog.loginRetryTimes}次重试`);
                        yield (0, utils_1.sleep)(this.retryOpt.retryDelaySeconds * 1000);
                        yield this.login();
                    }
                    else {
                        throw error;
                    }
                }
            }
            else {
                throw new Error('Must supply Docker registry credentials to push image!');
            }
        });
    }
    /**
     * Push Docker image & all tags
     */
    push(autoRetry = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.buildOpt.skipPush) {
                core.info('Input skipPush is set to true, skipping Docker push step...');
                return;
            }
            try {
                core.info(`Pushing tags ${this.buildOpt.tags} for Docker image ${this.buildOpt.imageName}...`);
                child_process_1.default.execSync(`docker push ${this.buildOpt.imageName} --all-tags`);
            }
            catch (error) {
                core.info(`Failed to Pushing tags ${this.buildOpt.tags} for Docker image ${this.buildOpt.imageName}...: ${error}`);
                if (autoRetry && this.retryOpt.maxRetryAttempts > 0 && this.retryLog.pushRetryTimes < this.retryOpt.maxRetryAttempts) {
                    if (this.retryLog.pushRetryTimes > 1) {
                        core.info(`多次尝试push失败，将进行登录尝试`);
                        yield this.login(false);
                    }
                    this.retryLog.pushRetryTimes++;
                    core.info(`Retry to Push tags ${this.buildOpt.tags} for Docker image : 第${this.retryLog.pushRetryTimes}次重试`);
                    yield (0, utils_1.sleep)(this.retryOpt.retryDelaySeconds * 1000);
                    yield this.push();
                }
                else {
                    throw error;
                }
            }
        });
    }
}
exports.DockerService = DockerService;
//# sourceMappingURL=docker.js.map