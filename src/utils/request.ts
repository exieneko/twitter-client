import { hrtime } from 'node:process';
import { parseHTML } from 'linkedom';
import { fetch, type BodyInit, type ProxyAgent, type Response } from 'undici';

import { log, toSearchParams } from './index.js';
import { GLOBAL_HEADERS, USER_AGENT } from '../consts.js';
import { ApiError, ClientError, RequestError, type TwitterOptions } from '../types/index.js';
import type { Endpoint, EndpointParams } from '../types/internal/index.js';
import type { Flags } from '../flags.js';

/**
 * Sends a request to an endpoint with the specified data
 * 
 * @param opts Options
 * @returns Tuple containing return data
 */
export async function request<E extends Endpoint, T = never>(opts: {
    endpoint: E,
    params?: EndpointParams<E>,
    cookies: Record<string, string>,
    mediaFormData?: BodyInit,
    options: TwitterOptions,
    proxyAgent?: ProxyAgent,
    transactionId?: string
}): Promise<[T, Response]> {
    const { endpoint, params, cookies, mediaFormData, options, proxyAgent, transactionId } = opts;

    if (endpoint.kind() !== 'GraphQL') {
        for (const key in params) {
            // @ts-ignore
            if (typeof params[key] === 'undefined') {
                // @ts-ignore
                delete params[key];
            }
        }
    }

    const url = endpoint.url.replace('twitter.com', options.domain);
    let headers: Record<string, string> = {
        ...GLOBAL_HEADERS,
        'accept-language': `${options.language === 'en' ? 'en-US,en' : options.language};q=0.9`,
        host: endpoint.url.replace(/^https:\/\//, '').replace('twitter.com', options.domain).replace(/\.com\/.*/, '.com'),
        origin: `https://${options.domain}`,
        referer: `https://${options.domain}/`,
        authorization: endpoint.token,
        cookie: Object.entries(cookies).filter(([, v]) => !!v).map(([k, v]) => `${k}=${v}`).join('; '),
        'user-agent': options.userAgent || USER_AGENT,
        'x-twitter-client-language': options.language,
        'x-csrf-token': cookies.ct0
    };

    if (transactionId) {
        headers['x-client-transaction-id'] = transactionId;
    }
    
    if (endpoint.kind() === 'GraphQL' || endpoint.kind() === 'v2Alt') {
        headers['content-type'] = 'application/json; charset=utf-8';
    } else if (endpoint.kind() !== 'Media' && !(endpoint.kind() === 'v1.1' && endpoint.method === 'GET' && !endpoint.features)) {
        headers['content-type'] = 'application/x-www-form-urlencoded; charset=utf-8';
    }

    if (options.overrides.headers) {
        headers = { ...headers, ...options.overrides.headers };
    }

    let features = endpoint.features;

    if (endpoint.kind() === 'GraphQL' && features && options.overrides.flags) {
        for (const k in options.overrides.flags) {
            const key = k as keyof Flags;
            const value = options.overrides.flags[key];

            if (typeof value === 'boolean' && key in features) {
                features[key] = value;
            }
        }
    }

    const start = hrtime.bigint();

    let response: Response;
    try {
        const variables = { ...endpoint.variables, ...params };
        const v11Body = new URLSearchParams({ ...endpoint.variables, ...params }).toString();

        let body: BodyInit | undefined = undefined;
        if (mediaFormData) {
            body = mediaFormData;
        } else if (endpoint.method === 'POST' && endpoint.kind() === 'GraphQL') {
            body = endpoint.post({ variables, features, queryId: endpoint.url.split('/', 1)[0] });
        } else if (endpoint.method === 'POST' && endpoint.kind() === 'v2Alt') {
            body = endpoint.post(variables);
        } else if (endpoint.method === 'POST') {
            body = endpoint.post(v11Body);
        }

        response = await fetch(endpoint.get(url, toSearchParams({ variables, features })), {
            method: endpoint.method,
            headers,
            body,
            dispatcher: proxyAgent
        });
    } catch (error) {
        throw new RequestError(`Failed to send request to "${url}"`, { endpoint, params, cause: error });
    }

    const elapsed = Math.floor(Number(hrtime.bigint() - start) / 1e6);

    let bytes: Uint8Array<ArrayBufferLike>;
    try {
        bytes = await response.bytes();
    } catch (error) {
        throw new RequestError('Failed to get response data due to Divine intervention', { endpoint, params, cause: error });
    }

    log[response.ok ? 'info' : 'err'](options, endpoint.method, response.status, `in ${elapsed}ms (transferred: ${bytes.byteLength}B)`);

    let text = '';
    let data;
    try {
        text = new TextDecoder().decode(bytes);
        data = JSON.parse(text);
    } catch (error) {
        if (error instanceof TypeError) {
            throw new ClientError('TextDecoder failed to decode response bytes to string', { cause: error });
        }

        // sometimes returned data for the translation.json endpoint is 2 JSON objects in 2 separate lines instead of in an array, so don't throw yet if that's the case
        if (!url.endsWith('/translation.json') || text.length < 2) {
            throw new ClientError('Received response data is not valid JSON', { cause: error });
        }

        try {
            const data = JSON.parse(text.trimEnd().split('\n', 2)[1]);
            throw new ApiError(data.message, { code: data.code });
        } catch (error) {
            throw new ClientError('Received response data is not valid JSON', { cause: error });
        }
    }

    return [data as T, response];
}

/**
 * Modified from fetchXDocument function in `x-client-transaction-id` to allow usage of a proxy
 * 
 * @see https://github.com/Lqm1/x-client-transaction-id/blob/main/utils.ts
 */
export async function fetchXDocument(opts: TwitterOptions, dispatcher?: ProxyAgent) {
    const headers = {
        ...GLOBAL_HEADERS,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': opts.language,
        pragma: 'no-cache',
        priority: 'u=0, i',
        'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'user-agent': opts.userAgent,
        'upgrade-insecure-requests': '1'
    };

    log.info(opts, 'GET https://x.com/home');
    const start = hrtime.bigint();
    const response = await fetch('https://x.com/home', { headers, dispatcher });
    const elapsed = Math.floor(Number(hrtime.bigint() - start) / 1e6);

    if (!response.ok) {
        log.err(opts, response.status, `in ${elapsed}ms`);
        throw new Error(response.status.toString());
    } else {
        log.info(opts, response.status, `in ${elapsed}ms`);
    }

    const html = await response.text();
    return parseHTML(html).window.document;
}
