import type { Endpoint } from './types/index.js';

export function v11(route: string) {
    return `https://api.%DOMAIN%/1.1/${route}`;
}

export function gql(domain: string, route: string) {
    return `https://${domain}/i/api/graphql/${route}`;
}

export function isGql(endpoint: Endpoint) {
    return !endpoint.url.startsWith('https://');
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
