import { hrtime } from 'node:process';
import { styleText } from 'node:util';
import { parseHTML } from 'linkedom';
import { fetch, type BodyInit, type ProxyAgent, type Response } from 'undici';

import { match, toSearchParams } from './index.js';
import type { Logger } from './log.js';
import { ENDPOINTS, GLOBAL_HEADERS, USER_AGENT } from '../consts.js';
import { ApiError, ClientError, RequestError } from '../fmt/errors.js';
import type { TwitterOptions } from '../types/index.js';
import { EndpointType, type Endpoint, type EndpointParams } from '../types/utils.js';
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
    transactionId?: string,
    log?: Logger
}): Promise<[T, Response]> {
    const { endpoint, params, cookies, mediaFormData, options, proxyAgent, transactionId, log } = opts;

    if (endpoint.getType() !== EndpointType.GraphQL) {
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
        authorization: endpoint.token,
        'cache-control': 'no-cache',
        connection: 'keep-alive',
        cookie: Object.entries(cookies).filter(([, v]) => !!v).map(([k, v]) => `${k}=${v}`).join('; '),
        host: endpoint.url.replace(/^https:\/\//, '').replace('twitter.com', options.domain).replace(/\.com\/.*/, '.com'),
        origin: `https://${options.domain}`,
        // pretend to send tweets from the home timeline
        referer: endpoint.getType() === EndpointType.GraphQL && /\/Create.*Tweet$/.test(endpoint.url) ? `https://${options.domain}/compose/post` : `https://${options.domain}`,
        'x-csrf-token': cookies.ct0,
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': options.language
    };

    if (transactionId) {
        headers['x-client-transaction-id'] = transactionId;
    }

    if (endpoint.getType() === EndpointType.GraphQL || endpoint.getType() === EndpointType.v2Alt) {
        headers['content-type'] = 'application/json';
    } else if (endpoint.getType() !== EndpointType.Media && !(endpoint.getType() === EndpointType.v11 && endpoint.method === 'GET')) {
        headers['content-type'] = 'application/x-www-form-urlencoded';
    }

    log?.info('[HTTP]', endpoint.method, url);

    for (const k in options.overrides.headers) {
        const key = k.toLowerCase();

        if (options.overrides.headers[key] === null) {
            delete headers[key];
            continue;
        }

        headers[key] = options.overrides.headers[key];
    }

    if (/Firefox\/\d+\.\d+$/.test(headers['user-agent'])) {
        headers['alt-used'] = options.domain;
    }

    let features = endpoint.features;
    if (endpoint.getType() === EndpointType.GraphQL && features && options.overrides.flags) {
        for (const k in options.overrides.flags) {
            const key = k as keyof Flags;
            const value = options.overrides.flags[key];

            if (typeof value === 'boolean' && key in features) {
                features[key] = value;
            }
        }
    }

    log?.debug('[HTTP]', 'Request headers:', headers);

    const start = hrtime.bigint();

    let response: Response;
    try {
        const variables = { ...endpoint.variables, ...params };
        const v11Body = new URLSearchParams({ ...endpoint.variables, ...params }).toString();

        let body: BodyInit | undefined = undefined;
        if (mediaFormData) {
            body = mediaFormData;
        } else {
            if (endpoint.method === 'POST' && endpoint.getType() === EndpointType.GraphQL) {
                body = endpoint.post({ variables, features, queryId: endpoint.url.split('/', 1)[0] });
            } else if (endpoint.method === 'POST' && endpoint.getType() === EndpointType.v2Alt) {
                body = endpoint.post(variables);
            } else if (endpoint.method === 'POST') {
                body = endpoint.post(v11Body);
            }

            if (body && body.length > 0) {
                headers['content-length'] = body.length.toString();
            }
        }

        response = await fetch(endpoint.get(url, toSearchParams({ variables, features })), {
            method: endpoint.method,
            headers,
            body,
            dispatcher: proxyAgent,
            credentials: 'include'
        });
    } catch (error) {
        throw new RequestError(`Failed to send request to "${url}"`, { endpoint, params, cause: error, log });
    }

    const elapsed = Math.floor(Number(hrtime.bigint() - start) / 1e6);

    let bytes: Uint8Array<ArrayBufferLike>;
    try {
        bytes = await response.bytes();
    } catch (error) {
        throw new RequestError('Failed to get response bytes', { endpoint, params, cause: error, log });
    } finally {
        bytes ||= new Uint8Array();

        const statusText = response.statusText || match(response.status, [
            [200, 'OK'],
            [201, 'Created'],
            [400, 'Bad Request'],
            [401, 'Unauthorized'],
            [403, 'Forbidden'],
            [404, 'Not Found'],
            [500, 'Internal Server Error']
        ], '');

        const transferred = bytes.byteLength >= 1024 * 2 ? (bytes.byteLength / 1024).toFixed(2) + 'K' : bytes.byteLength + 'B';

        log?.debug('[HTTP]', 'Response headers:', response.headers.entries());
        log?.[response.ok ? 'info' : 'error']('[HTTP]', endpoint.method, url, '\n\t' + styleText([response.ok ? 'green' : 'red', 'bold'], `${response.status} ${statusText}`), `\n\ttransferred ${transferred}`, `\n\tin ${elapsed}ms`);
    }

    let text = '';
    let data;
    try {
        text = new TextDecoder().decode(bytes);
        data = JSON.parse(text);
    } catch (error) {
        if (error instanceof Error) {
            log?.error(error);
        }

        if (error instanceof TypeError) {
            throw new ClientError('TextDecoder failed to decode response bytes to string', { cause: error });
        }

        const err = new ClientError('Received response data is not valid JSON', { cause: error });

        // sometimes returned data for the translation.json endpoint is 2 JSON objects in 2 separate lines instead of in an array, so don't throw yet if that's the case
        if (!url.endsWith('/translation.json') || text.length < 2) {
            throw err;
        }

        try {
            const data = JSON.parse(text.trimEnd().split('\n', 2)[1]);
            throw new ApiError(data.message, { code: data.code });
        } catch (error) {
            throw err;
        }
    }

    return [data as T, response];
}

/**
 * Modified from fetchXDocument function in `x-client-transaction-id` to allow usage of a proxy
 * 
 * @see https://github.com/Lqm1/x-client-transaction-id/blob/main/utils.ts
 */
export async function fetchXDocument(options: TwitterOptions, dispatcher?: ProxyAgent): Promise<Document> {
    const response = await fetch('https://x.com/i/jf', {
        headers: {
            ...GLOBAL_HEADERS,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            pragma: 'no-cache',
            'sec-ch-ua': options.overrides.headers?.['sec-ch-ua'] || GLOBAL_HEADERS['sec-ch-ua'],
            'sec-ch-ua-platform': options.overrides.headers?.['sec-ch-ua-platform'] || GLOBAL_HEADERS['sec-ch-ua-platform'],
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'user-agent': options.overrides.headers?.['user-agent'] || GLOBAL_HEADERS['user-agent']
        },
        dispatcher
    });
    const html = await response.text();
    return parseHTML(html).window.document;
}
