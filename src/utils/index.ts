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



type TwitterInstance = TwitterFormatter | TwitterClient | Partial<TwitterOptions>;

function shouldLog(value: TwitterInstance | undefined, key: keyof TwitterOptions = 'verbose'): boolean {
    if (typeof value === 'undefined') {
        return false;
    }

    if (value instanceof TwitterFormatter) return !!value.client.options[key];
    if (value instanceof TwitterClient) return !!value.options[key];
    if (typeof value === 'object') return !!value[key];
    return !!value;
}

export function log(client: TwitterInstance | undefined, data: any[]) {
    if (shouldLog(client)) {
        logger.info(...data);
    }
}

export function warn(client: TwitterInstance | undefined, data: any[]) {
    if (!shouldLog(client, 'silent')) {
        logger.warn(...data);
    }
}

export function err(client: TwitterInstance | undefined, data: any[]) {
    if (!shouldLog(client, 'silent')) {
        logger.error(...data);
    }
}
