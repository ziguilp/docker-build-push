"use strict";
/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-17 10:30:38
 * @FilePath      : /docker-build-push/src/utils.ts
 * @Description   :
 *
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cpOptions = exports.sleep = exports.parseArray = exports.timestamp = void 0;
const dateFormat_1 = __importDefault(require("dateFormat"));
const timestamp = () => (0, dateFormat_1.default)(new Date(), 'yyyy-mm-dd.HHMMss');
exports.timestamp = timestamp;
const parseArray = (commaDelimitedString) => {
    if (commaDelimitedString) {
        return commaDelimitedString.split(',').map(value => value.trim());
    }
    return undefined;
};
exports.parseArray = parseArray;
const sleep = (time = 1000) => {
    return new Promise((reslove, reject) => {
        setTimeout(() => {
            reslove(true);
        }, time);
    });
};
exports.sleep = sleep;
exports.cpOptions = {
    maxBuffer: 50 * 1024 * 1024,
    stdio: 'inherit'
};
//# sourceMappingURL=utils.js.map