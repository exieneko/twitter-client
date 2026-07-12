import type { AsyncConstructor, Enum, Type } from './index.js';
import { PUBLIC_TOKEN } from '../../consts.js';
import type { Flags } from '../../flags.js';
import type { TwitterFormatter } from '../../fmt/index.js';

export interface EndpointOptions<V extends object = {}> {
    url: string,
    method: 'get' | 'post',
    variables?: V,
    features?: Flags,
    token?: string,
    requiresTransactionId?: boolean
}

export class Endpoint<T = any, P extends object = any, V extends object = {}> implements EndpointOptions {
    url: string;
    method: 'get' | 'post';
    variables?: V;
    features?: Flags;
    token: string;
    requiresTransactionId: boolean;
    _params: P;

    constructor(opts: EndpointOptions<V>, public format: (fmt: TwitterFormatter, value: Record<string, any>) => Promise<T>) {
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
