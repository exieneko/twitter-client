import logger from 'node-color-log';
import { TwitterClient } from '../client.js';
import { TwitterFormatter } from '../fmt/index.js';
import { TwitterError, TwitterErrorCode, type ClientLogOptions, type TwitterOptions } from '../types/index.js';
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

function logLevel(value: TwitterInstance | undefined): ClientLogOptions {
    if (value instanceof TwitterFormatter) return value.client.options.logs;
    if (value instanceof TwitterClient) return value.options.logs;
    if (typeof value === 'object') return value.logs ?? 'Errors';
    return 'Errors';
}

export const log = {
    debug(client: TwitterInstance | undefined, ...data: any[]) {
        if (logLevel(client) === 'Debug') {
            logger.debug(...data);
        }
    },
    info(client: TwitterInstance | undefined, ...data: any[]) {
        if (logLevel(client) === 'Verbose' || logLevel(client) === 'Debug') {
            logger.info(...data);
        }
    },
    warn(client: TwitterInstance | undefined, ...data: any[]) {
        if (logLevel(client) !== 'Silent') {
            logger.warn(...data);
        }
    },
    err(client: TwitterInstance | undefined, ...data: any[]) {
        if (logLevel(client) !== 'Silent') {
            logger.error(...data);
        }
    }
};
