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

import dateFormat from 'dateFormat';

export const timestamp = () => dateFormat(new Date(), 'yyyy-mm-dd.HHMMss');

export const parseArray = (commaDelimitedString: string) => {
    if (commaDelimitedString) {
        return commaDelimitedString.split(',').map(value => value.trim());
    }
    return undefined;
};

export const sleep = (time = 1000) => {
    return new Promise((reslove, reject) => {
        setTimeout(() => {
            reslove(true)
        }, time)
    })
}

export const cpOptions = {
    maxBuffer: 50 * 1024 * 1024,
    stdio: 'inherit'
};
