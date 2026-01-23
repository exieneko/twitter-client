import type { Flags } from './flags.js';

export interface Tokens {
    authToken: string,
    csrf: string
}

export interface Endpoint<P extends object = {}, V extends object = {}, R extends object = any, T extends object = any> {
    url: string,
    method: 'get' | 'post',
    params?: P,
    variables?: V,
    features?: Flags,
    token?: string,
    parser: (data: R) => T
}

type OptionalUndefined<T extends object | undefined> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type Params<T extends { params?: object }> = OptionalUndefined<T['params']>;



export function v11(route: string) {
    return `https://api.twitter.com/1.1/${route}`;
}

export function gql(route: string) {
    return `https://twitter.com/i/api/graphql/${route}`;
}

export function tokenHeaders(tokens: Tokens) {
    return {
        'x-csrf-token': tokens.csrf,
        cookie: `auth_token=${tokens.authToken}; ct0=${tokens.csrf}; lang=en`
    };
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
