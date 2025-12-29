import { HEADERS, OAUTH_KEY, PUBLIC_TOKEN } from './consts.js';
import { Flags } from './flags.js';
import type { ClientResponse } from './types/index.js';

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
    useOauthKey?: boolean,
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
};

export function gql(route: string) {
    return `https://twitter.com/i/api/graphql/${route}`;
}

const tokenHeaders = (tokens: Tokens) => ({
    'x-csrf-token': tokens.csrf,
    cookie: `auth_token=${tokens.authToken}; ct0=${tokens.csrf}`
});

async function requestGql<T extends Endpoint>(endpoint: T, tokens: Tokens, params?: Params<T>): Promise<ClientResponse<ReturnType<T['parser']>>> {
    const toSearchParams = (obj: object) => {
        if (!obj || Object.entries(obj).every(([, value]) => value === undefined)) {
            return '';
        }

        return '?' + Object.entries(obj)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))}`)
            .join('&');
    };

    const url = gql(endpoint.url);

    const headers = { ...HEADERS, authorization: endpoint.useOauthKey ? OAUTH_KEY : PUBLIC_TOKEN, ...tokenHeaders(tokens) };

    let data: Parameters<Endpoint['parser']>[0] | null = null;

    try {
        const response = await (endpoint.method === 'get'
            ? fetch(url + toSearchParams({ variables: { ...endpoint.variables, ...params }, features: endpoint.features }), {
                method: endpoint.method,
                headers: headers
            })
            : fetch(url, {
                method: endpoint.method,
                headers: headers,
                body: JSON.stringify({
                    variables: { ...endpoint.variables, ...params },
                    features: endpoint.features,
                    queryId: endpoint.url.split('/', 1)[0]
                })
            })
        );

        data = await response.json();
    } catch (error) {
        return [[{
            code: -1,
            message: String(error)
        }]];
    }

    if (data?.errors && !data.data) {
        return [data.errors];
    }

    try {
        return [data?.errors || [], endpoint.parser(data)];
    } catch (error) {
        return [[{
            code: -1,
            message: String(error)
        }]];
    }
};

async function requestV11<T extends Endpoint>(endpoint: T, tokens: Tokens, params?: Params<T>): Promise<ClientResponse<ReturnType<T['parser']>>> {
    const body = Object.entries({ ...(endpoint.variables || {}), ...(params || {}) })
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');

    const headers = {
        ...HEADERS,
        authorization: endpoint.useOauthKey ? OAUTH_KEY : PUBLIC_TOKEN,
        'content-type': 'application/x-www-form-urlencoded',
        ...tokenHeaders(tokens)
    };

    let data: Parameters<T['parser']>[0] | null = null;

    try {
        const response = await fetch(endpoint.method === 'get' && body ? `${endpoint.url}?${body}` : endpoint.url, {
            method: endpoint.method,
            headers: headers,
            body: endpoint.method === 'post' && body ? body : undefined
        });

        data = await response.json();
    } catch (error) {
        return [[{
            code: -1,
            message: String(error)
        }]];
    }

    if (data?.errors) {
        return [data.errors];
    }

    try {
        return [data?.errors || [], endpoint.parser(data)];
    } catch (error) {
        return [[{
            code: -1,
            message: String(error)
        }]];
    }
};

export async function request<T extends Endpoint>(endpoint: T, tokens: Tokens, params?: Params<T>): Promise<ClientResponse<ReturnType<T['parser']>>> {
    if (endpoint.url.startsWith('https://api.twitter.com')) {
        return requestV11(endpoint, tokens, params);
    }

    return requestGql(endpoint, tokens, params);
};
