/*
 * @Author        : turbo 664120459@qq.com
 * @Date          : 2023-01-16 09:01:56
 * @LastEditors   : turbo 664120459@qq.com
 * @LastEditTime  : 2023-01-16 10:01:15
 * @FilePath      : /docker-build-push/src/utils.js
 * @Description   : 
 * 
 * Copyright (c) 2023 by turbo 664120459@qq.com, All Rights Reserved. 
 */
const dateFormat = require('dateformat');

const timestamp = () => dateFormat(new Date(), 'yyyy-mm-dd.HHMMss');

const parseArray = commaDelimitedString => {
    if (commaDelimitedString) {
        return commaDelimitedString.split(',').map(value => value.trim());
    }
    return undefined;
};

const sleep = (time = 1000) => {
    return new Promise((reslove, reject) => {
        setTimeout(() => {
            reslove(true)
        }, time)
    })
}

const cpOptions = {
    maxBuffer: 50 * 1024 * 1024,
    stdio: 'inherit'
};

module.exports = {
    timestamp,
    parseArray,
    cpOptions,
    sleep
};
