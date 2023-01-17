"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultOwner = exports.isBranch = exports.isGitHubTag = void 0;
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
const github_1 = require("@actions/github");
const isGitHubTag = (ref) => ref && ref.includes('refs/tags/');
exports.isGitHubTag = isGitHubTag;
const isBranch = (ref) => ref && ref.includes('refs/heads/');
exports.isBranch = isBranch;
// Returns owning organization of the repo where the Action is run
const getDefaultOwner = () => {
    let owner;
    try {
        const { repo } = github_1.context;
        owner = repo.owner;
    }
    catch (error) {
        throw new Error(`Can not get owner:${error}`);
    }
    return owner;
};
exports.getDefaultOwner = getDefaultOwner;
//# sourceMappingURL=github.js.map