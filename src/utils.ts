import { HEADERS, PUBLIC_TOKEN } from './consts.js';
import { Flags } from './flags.js';
import { mediaUpload } from './formatter/tweet.js';
import type { ClientResponse, Media, MediaUploadInit } from './types/index.js';

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

export const tokenHeaders = (tokens: Tokens) => ({
    'x-csrf-token': tokens.csrf,
    cookie: `auth_token=${tokens.authToken}; ct0=${tokens.csrf}; lang=en`
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

    const headers = {
        ...HEADERS,
        authorization: endpoint.token || PUBLIC_TOKEN,
        'content-type': 'application/json; charset=utf-8',
        ...tokenHeaders(tokens)
    };

    let data: Parameters<Endpoint['parser']>[0] | null = null;

    try {
        const response = await (endpoint.method === 'get'
            ? fetch(url + toSearchParams({ variables: { ...endpoint.variables, ...params }, features: endpoint.features }), {
                method: endpoint.method,
                headers
            })
            : fetch(url, {
                method: endpoint.method,
                headers,
                body: JSON.stringify({
                    variables: { ...endpoint.variables, ...params },
                    features: endpoint.features,
                    queryId: endpoint.url.split('/', 1)[0]
                })
            })
        );

        data = await response.json();
    } catch (error: any) {
        return [[{
            code: -1,
            message: String(error.stack)
        }]];
    }

    if (data?.errors && !data.data) {
        return [data.errors];
    }

    try {
        return [data?.errors || [], endpoint.parser(data)];
    } catch (error: any) {
        return [[{
            code: -1,
            message: String(error.stack)
        }]];
    }
}

async function requestV11<T extends Endpoint>(endpoint: T, tokens: Tokens, params?: Params<T>): Promise<ClientResponse<ReturnType<T['parser']>>> {
    const body = new URLSearchParams({ ...endpoint.variables, ...params }).toString();

    const headers = {
        ...HEADERS,
        authorization: endpoint.token || PUBLIC_TOKEN,
        'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
        ...tokenHeaders(tokens)
    };

    let data: Parameters<T['parser']>[0] | null = null;

    try {
        const response = await fetch(endpoint.method === 'get' && body ? `${endpoint.url}?${body}` : endpoint.url, {
            method: endpoint.method,
            headers: headers,
            body: endpoint.method === 'post' && body ? body : undefined
        });

        if (!response.headers.get('content-type')?.includes('application/json')) {
            return [[], endpoint.parser(data)];
        }

        data = await response.json();
    } catch (error: any) {
        return [[{
            code: -1,
            message: String(error.stack)
        }]];
    }

    if (data?.errors) {
        return [data.errors];
    }

    try {
        return [data?.errors || [], endpoint.parser(data)];
    } catch (error: any) {
        return [[{
            code: -1,
            message: String(error.stack)
        }]];
    }
}

export async function request<T extends Endpoint>(endpoint: T, tokens: Tokens, params?: Params<T>): Promise<ClientResponse<ReturnType<T['parser']>>> {
    if (endpoint.url.startsWith('https://api.twitter.com')) {
        return requestV11(endpoint, tokens, params);
    }

    return requestGql(endpoint, tokens, params);
}



export async function uploadInit(tokens: Tokens, args: { bytes: number, contentType: string }): Promise<ClientResponse<MediaUploadInit>> {
    const body = new URLSearchParams({
        command: 'INIT',
        total_bytes: args.bytes.toString(),
        media_type: args.contentType,
        media_category: args.contentType.startsWith('video/') ? 'tweet_video' : args.contentType.endsWith('gif') ? 'tweet_gif' : 'tweet_image'
    });

    const response = await fetch('https://upload.x.com/1.1/media/upload.json', {
        method: 'post',
        headers: {
            ...HEADERS,
            authorization: PUBLIC_TOKEN,
            'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
            ...tokenHeaders(tokens)
        },
        body
    });

    if (response.ok) {
        const data = await response.json();
        return [[], data as MediaUploadInit];
    }

    return [[{
        code: -1,
        message: await response.text()
    }]];
}

export async function uploadAppend(tokens: Tokens, args: { id: string, data: ArrayBuffer, index: number, contentType: string }) {
    const body = new URLSearchParams({
        command: 'APPEND',
        media_id: args.id,
        segment_index: args.index.toString()
    }).toString();

    let formData = new FormData();
    formData.append('media', new Blob([args.data], { type: args.contentType }));

    return await fetch(`https://upload.x.com/1.1/media/upload.json?${body}`, {
        method: 'post',
        headers: {
            ...HEADERS,
            authorization: PUBLIC_TOKEN,
            ...tokenHeaders(tokens)
        },
        body: formData
    });
}

export async function uploadFinalize(tokens: Tokens, args: { id: string }): Promise<ClientResponse<Media>> {
    const response = await fetch(`https://upload.x.com/1.1/media/upload.json?command=FINALIZE&media_id=${args.id}`, {
        method: 'post',
        headers: {
            ...HEADERS,
            authorization: PUBLIC_TOKEN,
            'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
            ...tokenHeaders(tokens)
        }
    });

    try {
        if (!response.ok) {
            const { errors } = await response.json();
            return [errors ?? []];
        }

        const data = await response.json();
        return [[], mediaUpload(data)];
    } catch (error) {
        return [[{
            code: -1,
            message: await response.text()
        }]];
    }
}

export async function uploadStatus(tokens: Tokens, args: { id: string }): Promise<ClientResponse<Media>> {
    const response = await fetch(`https://upload.x.com/1.1/media/upload.json?command=STATUS&media_id=${args.id}`, {
        headers: {
            ...HEADERS,
            authorization: PUBLIC_TOKEN,
            'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
            ...tokenHeaders(tokens)
        }
    });

    try {
        if (!response.ok) {
            const { errors } = await response.json();
            return [errors ?? []];
        }

        const data = await response.json();
        return [[], mediaUpload(data)];
    } catch (error) {
        return [[{
            code: -1,
            message: await response.text()
        }]];
    }
}
