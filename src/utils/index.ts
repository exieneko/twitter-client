import logger from 'node-color-log';
import { TwitterClient } from '../client.js';
import { TwitterFormatter } from '../fmt/index.js';
import { TwitterError, TwitterErrorCode, TwitterOptions } from '../types/index.js';
import type { Type } from '../types/internal/index.js';

export function match<K, V>(key: K, cases: [K | K[], V | (() => V), (boolean | (() => boolean))?][]): V | undefined;
export function match<K, V>(key: K, cases: [K | K[], V | (() => V), (boolean | (() => boolean))?][], or: V | (() => V)): V;

export function match<K, V>(key: K, cases: [K | K[], V | (() => V), (boolean | (() => boolean))?][], or?: V | (() => V)) {
    for (const [k, value, condition] of cases) {
        if ((Array.isArray(k) && k.includes(key)) || key === k) {
            if ((typeof condition === 'boolean' && !condition) || (typeof condition === 'function' && !condition())) {
                continue;
            }

            if (typeof value === 'function') {
                return (value as () => V)();
            }

            return value;
        }
    }

    if (!!or && typeof or === 'function') {
        return (or as () => V)();
    }

    return or;
}



export function assert<T extends U, U extends Type>(value: U, desiredType: U['__typename'] | U['__typename'][]): T {
    if (typeof desiredType === 'string' ? value.__typename !== desiredType : !desiredType.includes(value.__typename)) {
        throw new TwitterError(TwitterErrorCode.IncorrectAssertion, {
            data: [value.__typename, desiredType]
        });
    }

    return value as T;
}



export function v11(route: string, useSubdomain: boolean = true) {
    if (useSubdomain) {
        return `https://api.twitter.com/1.1/${route}`;
    }

    return `https://twitter.com/i/api/1.1/${route}`;
}

export function gql(route: string) {
    return `https://twitter.com/i/api/graphql/${route}`;
}



export function toSearchParams(obj: object) {
    if (!obj || Object.entries(obj).every(([, value]) => value === undefined)) {
        return '';
    }

    return '?' + Object.entries(obj)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))}`)
        .join('&');
}



type TwitterInstance = TwitterFormatter | TwitterClient | TwitterOptions | boolean;

function shouldLog(value: TwitterInstance) {
    return (value instanceof TwitterFormatter && value.client.options.verbose) || (value instanceof TwitterClient && value.options.verbose) || (!(value instanceof TwitterFormatter) && !(value instanceof TwitterClient) && typeof value !== 'boolean' && value.verbose) || (typeof value === 'boolean' && value);
}

export function log(client: TwitterInstance, ...data: any[]) {
    if (shouldLog(client)) {
        logger.info(data);
    }
}

export function warn(client: TwitterInstance, ...data: any[]) {
    if (shouldLog(client)) {
        logger.warn(data);
    }
}

export function err(client: TwitterInstance, ...data: any[]) {
    if (shouldLog(client)) {
        logger.error(data);
    }
}
