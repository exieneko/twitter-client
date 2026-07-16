import { hrtime } from 'node:process';
import { parseHTML } from 'linkedom';
import { fetch, type BodyInit, type ProxyAgent, type Response } from 'undici';

import { log, toSearchParams } from './index.js';
import { GLOBAL_HEADERS } from '../consts.js';
import type { TwitterOptions } from '../types/index.js';
import type { Endpoint, EndpointParams } from '../types/internal/index.js';

export async function request<EP extends Endpoint, T, E extends Error = Error>(endpoint: EP, params: EndpointParams<EP> | undefined, options: TwitterOptions, { cookies, proxyAgent, transactionId, body }: {
    cookies: Record<string, string>,
    proxyAgent?: ProxyAgent,
    transactionId?: string,
    body?: BodyInit
}): Promise<[T | E, Response?]> {
    const headers: Record<string, string> = {
        ...GLOBAL_HEADERS,
        'accept-language': `${options.language === 'en' ? 'en-US,en' : options.language};q=0.9`,
        host: endpoint.url.replace(/^https:\/\//, '').replace('twitter.com', options.domain).replace(/\.com\/.*/, '.com'),
        origin: `https://${options.domain}`,
        referer: `https://${options.domain}/`,
        authorization: endpoint.token,
        'user-agent': options.userAgent,
        'x-twitter-client-language': options.language,
        'x-csrf-token': cookies.ct0
    };

    headers['cookie'] = Object
        .entries(cookies)
        .filter(([, v]) => !!v)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

    if (transactionId) {
        headers['x-client-transaction-id'] = transactionId;
    }

    if (endpoint.kind() !== 'Media') {
        headers['content-type'] = endpoint.kind() === 'GraphQL' || endpoint.kind() === 'v2Alt'
            ? 'application/json; charset=utf-8'
            : 'application/x-www-form-urlencoded; charset=utf-8';
    }

    if (headers['content-type'] && endpoint.method === 'GET' && !endpoint.features && endpoint.kind() === 'v1.1') {
        delete headers['content-type'];
    }



    const url = endpoint.url.replace('twitter.com', options.domain);
    const requestData = [
        url,
        endpoint,
        params,
        headers,
        proxyAgent
    ] as const;

    log.info(options, endpoint.method, url);
    const start = hrtime.bigint();

    try {
        const response = endpoint.kind() === 'GraphQL'
            ? await sendGqlRequest<EP, E>(...requestData)
            : await sendRequest<EP, E>(...requestData, endpoint.kind() === 'Media' ? body : undefined);

        if (response instanceof Error) {
            log.err(options, response);
            return [response as E];
        }

        const elapsed = Math.floor(Number(hrtime.bigint() - start) / 1e6);
        const logData = [endpoint.method, response.status, `in ${elapsed}ms`];

        log[response.ok ? 'info' : 'err'](options, ...logData);

        const data = await response.json();
        return [data as T, response];
    } catch (error) {
        log.err(options, error);
        return [error as E];
    }
}

async function sendGqlRequest<EP extends Endpoint, E extends Error>(url: string, endpoint: EP, params: EndpointParams<EP> | undefined, headers: Record<string, string>, proxyAgent?: ProxyAgent) {
    const variables = { ...endpoint.variables, ...params };

    try {
        return await fetch(endpoint.get(url, toSearchParams({ variables, features: endpoint.features })), {
            method: endpoint.method,
            headers,
            body: endpoint.post({
                variables,
                features: endpoint.features,
                queryId: endpoint.url.split('/', 1)[0]
            }),
            dispatcher: proxyAgent
        });
    } catch (error) {
        return error as E;
    }
}

async function sendRequest<EP extends Endpoint, E extends Error>(url: string, endpoint: EP, params: EndpointParams<EP> | undefined, headers: Record<string, any>, proxyAgent?: ProxyAgent, mediaFormData?: BodyInit) {
    for (const key in params) {
        // @ts-ignore
        if (typeof params[key] === 'undefined') {
            // @ts-ignore
            delete params[key];
        }
    }

    const body = new URLSearchParams({ ...endpoint.variables, ...params }).toString();

    try {
        return await fetch(((endpoint.method === 'GET' && body) || mediaFormData) ? `${url}?${body}` : url, {
            method: endpoint.method,
            headers,
            body: mediaFormData
                ? mediaFormData
            : endpoint.method === 'POST' && endpoint.kind() === 'v2Alt'
                ? endpoint.post({ ...endpoint.variables, ...params })
                : endpoint.post(body),
            dispatcher: proxyAgent
        });
    } catch (error) {
        return error as E;
    }
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
