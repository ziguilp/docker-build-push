"use strict";
/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 11:12:40
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
const docker = __importStar(require("./docker"));
const github = __importStar(require("./github"));
const utils_1 = require("./utils");
const buildOpts = {
    tags: undefined,
    buildArgs: undefined,
    labels: undefined,
    target: undefined,
    buildDir: undefined,
    enableBuildKit: false,
    platform: undefined,
    skipPush: false
};
(() => __awaiter(void 0, void 0, void 0, function* () {
    // Capture action inputs
    const image = core.getInput('image', { required: true });
    const registry = core.getInput('registry', { required: true });
    const username = core.getInput('username');
    const password = core.getInput('password');
    const dockerfile = core.getInput('dockerfile');
    const githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
    const addLatest = core.getInput('addLatest') === 'true';
    const addTimestamp = core.getInput('addTimestamp') === 'true';
    const maxRetryAttempts = Number(core.getInput('maxRetryAttempts') || 0);
    let retryDelaySeconds = Number(core.getInput('retryDelaySeconds') || 0);
    retryDelaySeconds = retryDelaySeconds >= 0 ? retryDelaySeconds : 0;
    buildOpts.tags = (0, utils_1.parseArray)(core.getInput('tags')) || docker.createTags(addLatest, addTimestamp);
    buildOpts.buildArgs = (0, utils_1.parseArray)(core.getInput('buildArgs'));
    buildOpts.labels = (0, utils_1.parseArray)(core.getInput('labels'));
    buildOpts.target = core.getInput('target');
    buildOpts.buildDir = core.getInput('directory') || '.';
    buildOpts.enableBuildKit = core.getInput('enableBuildKit') === 'true';
    buildOpts.platform = core.getInput('platform');
    buildOpts.skipPush = core.getInput('pushImage') === 'false';
    // Create the Docker image name
    const imageFullName = docker.createFullImageName(registry, image, githubOwner);
    core.info(`Docker image name used for this build: ${imageFullName}`);
    // Log in, build & push the Docker image
    yield docker.login(username, password, registry, buildOpts.skipPush, maxRetryAttempts, retryDelaySeconds);
    yield docker.build(imageFullName, dockerfile, buildOpts);
    yield docker.push(imageFullName, buildOpts.tags, buildOpts.skipPush, maxRetryAttempts, retryDelaySeconds);
    // Capture outputs
    core.setOutput('imageFullName', imageFullName);
    core.setOutput('imageName', image);
    core.setOutput('tags', buildOpts.tags.join(','));
}))().catch(error => {
    core.setFailed(error.message);
});
//# sourceMappingURL=main.js.map