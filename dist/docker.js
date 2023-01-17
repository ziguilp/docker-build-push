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
exports.push = exports.login = exports.getRegion = exports.isEcr = exports.build = exports.createBuildCommand = exports.createTags = exports.createFullImageName = void 0;
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
const child_process_1 = __importDefault(require("child_process"));
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const github_1 = require("@actions/github");
const github_2 = require("./github");
const utils_1 = require("./utils");
const GITHUB_REGISTRY_URLS = ['docker.pkg.github.com', 'ghcr.io'];
/**
 * Create the full Docker image name with registry prefix (without tags)
 * @returns `${registry}/${image}`;
 */
const createFullImageName = (registry, image, githubOwner) => {
    if (GITHUB_REGISTRY_URLS.includes(registry)) {
        return `${registry}/${githubOwner.toLowerCase()}/${image}`;
    }
    return `${registry}/${image}`;
};
exports.createFullImageName = createFullImageName;
/**
 * Create Docker tags based on input flags & Git branch
 *
 */
const createTags = (addLatest, addTimestamp) => {
    core.info('Creating Docker image tags...');
    const { sha } = github_1.context;
    const ref = github_1.context.ref.toLowerCase();
    const shortSha = sha.substring(0, 7);
    const dockerTags = [];
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
        const tag = addTimestamp ? `${baseTag}-${(0, utils_1.timestamp)()}` : baseTag;
        dockerTags.push(tag);
    }
    else {
        throw new Error('Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push');
    }
    if (addLatest) {
        dockerTags.push('latest');
    }
    core.info(`Docker tags created: ${dockerTags}`);
    return dockerTags;
};
exports.createTags = createTags;
/**
 * Dynamically create 'docker build' command based on inputs provided
 */
const createBuildCommand = (imageName, dockerfile, buildOpts) => {
    const tagsSuffix = buildOpts.tags.map((tag) => `-t ${imageName}:${tag}`).join(' ');
    let buildCommandPrefix = `docker build -f ${dockerfile} ${tagsSuffix}`;
    if (buildOpts.buildArgs) {
        const argsSuffix = buildOpts.buildArgs.map((arg) => `--build-arg ${arg}`).join(' ');
        buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
    }
    if (buildOpts.labels) {
        const labelsSuffix = buildOpts.labels.map((label) => `--label ${label}`).join(' ');
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
exports.createBuildCommand = createBuildCommand;
// Perform 'docker build' command
const build = (imageName, dockerfile, buildOpts) => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs_1.default.existsSync(dockerfile)) {
        throw new Error(`Dockerfile does not exist in location ${dockerfile}`);
    }
    core.info(`Building Docker image ${imageName} with tags ${buildOpts.tags}...`);
    child_process_1.default.execSync((0, exports.createBuildCommand)(imageName, dockerfile, buildOpts));
});
exports.build = build;
const isEcr = (registry) => registry && registry.includes('amazonaws');
exports.isEcr = isEcr;
const getRegion = (registry) => registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));
exports.getRegion = getRegion;
// Log in to provided Docker registry
const login = (username, password, registry, skipPush, maxRetryAttempts = 1, retryDelaySeconds = 1) => __awaiter(void 0, void 0, void 0, function* () {
    if (skipPush) {
        core.info('Input skipPush is set to true, skipping Docker log in step...');
        return;
    }
    // If using ECR, use the AWS CLI login command in favor of docker login
    if ((0, exports.isEcr)(registry)) {
        const region = (0, exports.getRegion)(registry);
        core.info(`Logging into ECR region ${region}...`);
        child_process_1.default.execSync(`aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registry}`);
    }
    else if (username && password) {
        core.info(`Logging into Docker registry ${registry}...`);
        try {
            child_process_1.default.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
                input: password
            });
        }
        catch (error) {
            core.info(`Failed to Logging into Docker registry ${registry}: ${error}`);
            if (maxRetryAttempts > 0) {
                core.info(`Retry to Logging into Docker registry ${registry}...`);
                yield (0, utils_1.sleep)(retryDelaySeconds * 1000);
                yield (0, exports.login)(username, password, registry, skipPush, maxRetryAttempts - 1, retryDelaySeconds);
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
exports.login = login;
/**
 * Push Docker image & all tags
 */
const push = (imageName, tags, skipPush, maxRetryAttempts = 1, retryDelaySeconds = 1) => __awaiter(void 0, void 0, void 0, function* () {
    if (skipPush) {
        core.info('Input skipPush is set to true, skipping Docker push step...');
        return;
    }
    try {
        core.info(`Pushing tags ${tags} for Docker image ${imageName}...`);
        child_process_1.default.execSync(`docker push ${imageName} --all-tags`);
    }
    catch (error) {
        core.info(`Failed to Pushing tags ${tags} for Docker image ${imageName}...: ${error}`);
        if (maxRetryAttempts > 0) {
            core.info(`Retry to Pushing tags ${tags} for Docker image ${imageName}`);
            yield (0, utils_1.sleep)(retryDelaySeconds * 1000);
            yield (0, exports.push)(imageName, tags, skipPush, maxRetryAttempts - 1, retryDelaySeconds);
        }
        else {
            throw error;
        }
    }
});
exports.push = push;
//# sourceMappingURL=docker.js.map