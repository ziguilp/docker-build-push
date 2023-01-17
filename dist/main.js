"use strict";
/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 12:49:45
 * @FilePath      : /docker-build-push/src/main.ts
 * @Description   : forked from mr-smithers-excellent/docker-build-push
 *
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const docker_1 = require("./docker");
const utils_1 = require("./utils");
const buildOpts = {
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
    dockerFile: undefined
};
(() => __awaiter(void 0, void 0, void 0, function* () {
    // Capture action inputs
    const registry = core.getInput('registry', { required: true });
    const image = core.getInput('image', { required: true });
    const username = core.getInput('username');
    const password = core.getInput('password');
    const docker = new docker_1.DockerService(registry, username && password ? {
        username,
        password
    } : undefined);
    docker.setBuildOption({
        imageName: docker.createFullImageName(image),
        tags: (0, utils_1.parseArray)(core.getInput('tags')) || [],
        buildArgs: (0, utils_1.parseArray)(core.getInput('buildArgs')),
        labels: (0, utils_1.parseArray)(core.getInput('labels')),
        target: core.getInput('target'),
        buildDir: core.getInput('directory') || '.',
        enableBuildKit: core.getInput('enableBuildKit') === 'true',
        platform: core.getInput('platform'),
        skipPush: core.getInput('pushImage') === 'false',
        addTimestamp: core.getInput('addTimestamp') === 'true',
        addLatest: core.getInput('addLatest') === 'true',
        addGithubTag: core.getInput('addGithubTag') === 'true',
        dockerFile: core.getInput('dockerfile')
    });
    docker.setRetryOption({
        maxRetryAttempts: Number(core.getInput('maxRetryAttempts') || 0),
        retryDelaySeconds: Number(core.getInput('retryDelaySeconds') || 0),
    });
    docker.createTags();
    // Create the Docker image name
    core.info(`Docker image name used for this build: ${docker.buildOpt.imageName}`);
    // Log in, build & push the Docker image
    yield docker.login();
    yield docker.build();
    yield docker.push();
    // Capture outputs
    core.setOutput('imageFullName', docker.buildOpt.imageName);
    core.setOutput('imageName', image);
    core.setOutput('tags', docker.buildOpt.tags.join(','));
}))().catch(error => {
    core.setFailed(error.message);
});
//# sourceMappingURL=main.js.map