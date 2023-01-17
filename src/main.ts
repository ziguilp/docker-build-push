/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 12:23:11
 * @FilePath      : /docker-build-push/src/main.ts
 * @Description   : forked from mr-smithers-excellent/docker-build-push
 * 
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved. 
 */

import * as core from '@actions/core';
import { DockerService, ImageBuildOption } from './docker';
import * as github from './github';
import { parseArray } from './utils';

const buildOpts: ImageBuildOption = {
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

(async () => {
    // Capture action inputs
    const registry = core.getInput('registry', { required: true });
    const image = core.getInput('image', { required: true });
    const username = core.getInput('username');
    const password = core.getInput('password');


    const docker = new DockerService(registry, username && password ? {
        username,
        password
    } : undefined)

    docker.setBuildOption({
        imageName: docker.createFullImageName(image),
        tags: parseArray(core.getInput('tags')) || [],
        buildArgs: parseArray(core.getInput('buildArgs')),
        labels: parseArray(core.getInput('labels')),
        target: core.getInput('target'),
        buildDir: core.getInput('directory') || '.',
        enableBuildKit: core.getInput('enableBuildKit') === 'true',
        platform: core.getInput('platform'),
        skipPush: core.getInput('pushImage') === 'false',
        addTimestamp: core.getInput('addTimestamp') === 'true',
        addLatest: core.getInput('addLatest') === 'true',
        dockerFile: core.getInput('dockerfile')
    });

    docker.setRetryOption({
        maxRetryAttempts: Number(core.getInput('maxRetryAttempts') || 0),
        retryDelaySeconds: Number(core.getInput('retryDelaySeconds') || 0),
    })

    docker.createTags();

    // Create the Docker image name
    core.info(`Docker image name used for this build: ${docker.buildOpt.imageName}`);

    // Log in, build & push the Docker image
    await docker.login();
    await docker.build();
    await docker.push();

    // Capture outputs
    core.setOutput('imageFullName', docker.buildOpt.imageName);
    core.setOutput('imageName', image);
    core.setOutput('tags', docker.buildOpt.tags.join(','));
})().catch(error => {
    core.setFailed((error as any).message);
});