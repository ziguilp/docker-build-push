/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 10:33:28
 * @FilePath      : /docker-build-push/src/github.ts
 * @Description   : 
 * 
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved. 
 */
import { context } from '@actions/github';

export const isGitHubTag = (ref: string) => ref && ref.includes('refs/tags/');

export const isBranch = (ref: string) => ref && ref.includes('refs/heads/');

// Returns owning organization of the repo where the Action is run
export const getDefaultOwner = () => {
    let owner: any;
    try {
        const { repo } = context;
        owner = repo.owner;
    } catch (error) {
        throw new Error(`Can not get owner:${error}`)
    }

    return owner;
};