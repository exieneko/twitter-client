import { fetch, type BodyInit, type ProxyAgent, type Response } from 'undici';
import { hrtime } from 'process';

import { endpointKind, err, log, toSearchParams, warn } from './index.js';
import { GLOBAL_HEADERS, MAX_ACCEPTABLE_REQUEST_TIME, PUBLIC_TOKEN } from '../consts.js';
import type { TwitterOptions, TwitterTokens } from '../types/index.js';
import { EndpointKind, type Endpoint, type Params } from '../types/internal.js';

export async function request<EP extends Endpoint, T, E extends Error = Error>(endpoint: EP, params: Params<EP> | undefined, options: TwitterOptions, tokens: TwitterTokens, proxyAgent?: ProxyAgent, userId?: string, transactionId?: string, body?: BodyInit): Promise<[T | E, Response?]> {
    const start = hrtime.bigint();
    const kind = endpointKind(endpoint);

    const headers: Record<string, string> = {
        ...GLOBAL_HEADERS,
        'Accept-Language': `${options.language === 'en' ? 'en-US,en' : options.language};q=0.5`,
        Host: (endpoint.url.replace('https://', '').replace('.com/', '') + '.com').replace('twitter.com', options.domain),
        Origin: `https://${options.domain}`,
        Referer: `https://${options.domain}/`,
        authorization: endpoint.token || PUBLIC_TOKEN,
        'User-Agent': options.userAgent,
        'x-csrf-token': tokens.csrf
    };

    const cookie = {
        auth_token: tokens.authToken,
        ct0: tokens.csrf,
        twid: userId ? `u%3D${userId}` : undefined,
        lang: options.language
    };

    headers['cookie'] = Object.entries(cookie).filter(([, v]) => !!v).map(([k, v]) => `${k}=${v}`).join('; ');

    if (transactionId) {
        headers['x-client-transaction-id'] = transactionId;
    }

    if (kind !== EndpointKind.Media) {
        headers['Content-Type'] = kind === EndpointKind.GraphQL
            ? 'application/json; charset=utf-8'
            : 'application/x-www-form-urlencoded; charset=utf-8';
    }



    const requestData = [
        endpoint.url.replace('twitter.com', options.domain),
        endpoint,
        params,
        headers,
        proxyAgent
    ] as const;

    log(options, endpoint.method, endpoint.url);

    try {
        const response = kind === EndpointKind.GraphQL
            ? await sendGqlRequest<EP, E>(...requestData)
            : await sendRequest<EP, E>(...requestData, kind === EndpointKind.Media ? body : undefined);

        if (response instanceof Error) {
            err(options, 'Unexpected error:', response);
            return [response as E];
        }

        const elapsed = Math.floor(Number(hrtime.bigint() - start) / 1e6);
        const logData = [options, `${response.status} ${response.statusText} in ${elapsed}ms`] as const;

        if (response.ok && elapsed > MAX_ACCEPTABLE_REQUEST_TIME) {
            warn(...logData);
        } else if (response.ok) {
            log(...logData);
        } else {
            err(...logData);
        }

        const data = <T>await response.json();
        return [data, response];
    } catch (error) {
        err(options, 'Unexpected error:', error);
        return [error as E];
    }
}

async function sendGqlRequest<EP extends Endpoint, E extends Error>(url: string, endpoint: EP, params: Params<EP> | undefined, headers: Record<string, string>, proxyAgent?: ProxyAgent) {
    const variables = { ...endpoint.variables, ...params };

    try {
        return await fetch(endpoint.method === 'GET' ? url + toSearchParams({ variables, features: endpoint.features }) : url, {
            method: endpoint.method,
            headers,
            body: endpoint.method === 'POST' ? JSON.stringify({
                variables,
                features: endpoint.features,
                queryId: endpoint.url.split('/', 1)[0]
            }) : undefined,
            dispatcher: proxyAgent
        });
    } catch (error) {
        return <E>error;
    }
}

async function sendRequest<EP extends Endpoint, E extends Error>(url: string, endpoint: EP, params: Params<EP> | undefined, headers: Record<string, any>, proxyAgent?: ProxyAgent, mediaFormData?: BodyInit) {
    const body = new URLSearchParams({ ...endpoint.variables, ...params }).toString();

    try {
        return await fetch((endpoint.method === 'GET' && body || mediaFormData) ? `${url}?${body}` : url, {
            method: endpoint.method,
            headers,
            body: mediaFormData
                ? mediaFormData
            : endpoint.method === 'POST' && body
                ? body
                : undefined,
            dispatcher: proxyAgent
        });
    } catch (error) {
        return <E>error;
    }
}
