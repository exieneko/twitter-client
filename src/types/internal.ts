import type { TwitterClient } from '../client.js';
import { PUBLIC_TOKEN } from '../consts.js';
import type { Flags } from '../flags.js';
import type { TwitterFormatter } from '../fmt/index.js';

export type Enum<T> = T[keyof T];

export interface Type<K extends string = string> {
    /** Unique identifier for types used by GraphQL */
    __typename: K
}

export type AsyncConstructor<This, T = any, O extends Record<string, any> | null = null> = O extends null
    ? (fmt: TwitterFormatter, value: T) => Promise<This>
    : (fmt: TwitterFormatter, value: T, opts: O) => Promise<This>;



export interface Account {
    id: number,
    client: TwitterClient,
    // TODO: make this read the rate limit header instead of just increasing the count for every action
    uses: number
}

export class Endpoint<T = any, P extends object = {}, V extends object = {}> {
    url: string;
    method: 'get' | 'post';
    variables?: V;
    features?: Flags;
    token: string;
    requiresTransactionId: boolean;
    _params: P;

    constructor(opts: { url: string, method: 'get' | 'post', variables?: V, features?: Flags, token?: string, requiresTransactionId?: boolean }, public format: AsyncConstructor<T>) {
        this.url = opts.url;
        this.method = opts.method;
        this.variables = opts.variables;
        this.features = opts.features;
        this.token = opts.token || PUBLIC_TOKEN;
        this.requiresTransactionId = !!opts.requiresTransactionId;
        this._params = {} as P;
    }

    get(url: string, body?: string) {
        if (this.method === 'get' && body && body.length > 0) {
            return url + body;
        }

        return url;
    }

    post(body?: any): string | undefined {
        if (this.method === 'post' && body) {
            return JSON.stringify(body);
        }
    }

    kind(): EndpointKind {
        if (this.url.includes('upload.twitter.com')) {
            return EndpointKind.Media;
        } else if (this.url.includes('/i/api/graphql')) {
            return EndpointKind.GraphQL;
        } else if (this.url.includes('/i/api/2')) {
            return EndpointKind.v2;
        }

        return EndpointKind.v11;
    }
}

export const EndpointKind = {
    GraphQL: 'GraphQL',
    v11: 'v1.1',
    v2: 'v2',
    Media: 'Media'
} as const;
export type EndpointKind = Enum<typeof EndpointKind>;

export interface EndpointGroup {
    [key: string]: Endpoint
}



type OptionalUndefined<T extends object | undefined> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type Params<T extends { _params?: object }> = OptionalUndefined<T['_params']>;
