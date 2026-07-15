import type { Enum } from './index.js';
import { PUBLIC_TOKEN } from '../../consts.js';
import type { Flags } from '../../flags.js';
import type { TwitterFormatter } from '../../fmt/index.js';

export interface EndpointOptions<V extends object = {}> {
    url: string,
    method: 'get' | 'post',
    variables?: V,
    features?: Flags,
    token?: string,
    /**
     * @deprecated Transaction id will be generated for all endpoints
     */
    requiresTransactionId?: boolean
}

export class Endpoint<T = any, P extends object = {}, V extends object = {}> implements Omit<EndpointOptions, 'method'> {
    url: string;
    method: Uppercase<EndpointOptions['method']>;
    variables?: V;
    features?: Flags;
    token: string;
    requiresTransactionId: boolean;
    _params: P;

    constructor(opts: EndpointOptions<V>, public format: (fmt: TwitterFormatter, value: Record<string, any>) => Promise<T>) {
        this.url = opts.url;
        this.method = opts.method.toUpperCase() as typeof this.method;
        this.variables = opts.variables;
        this.features = opts.features;
        this.token = opts.token || PUBLIC_TOKEN;
        this.requiresTransactionId = !!opts.requiresTransactionId;
        this._params = {} as P;
    }

    get(url: string, body?: string) {
        if (this.method === 'GET' && body && body.length > 0) {
            return url + body;
        }

        return url;
    }

    post(body?: any): string | undefined {
        if (this.method === 'POST' && body) {
            if (this.kind() === 'GraphQL') {
                return JSON.stringify(body);
            }
            return String(body);
        }
    }

    kind(): EndpointKind {
        if (this.url.includes('upload.twitter.com')) {
            return 'Media';
        } else if (this.url.includes('/i/api/graphql')) {
            return 'GraphQL';
        } else if (this.url.includes('/i/api/2')) {
            return 'v2';
        } else if (this.url.includes('api.twitter.com/2/')) {
            return 'v2Alt';
        }

        return 'v1.1';
    }
}

export const EndpointKind = {
    GraphQL: 'GraphQL',
    v11: 'v1.1',
    v2: 'v2',
    v2Alt: 'v2Alt',
    Media: 'Media'
} as const;
export type EndpointKind = Enum<typeof EndpointKind>;

export interface EndpointGroup {
    [key: string]: Endpoint
}
