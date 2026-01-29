import type { Endpoint } from './types/index.js';

export function v11(domain: string, route: string) {
    return `https://api.${domain}/${route}`;
}

export function gql(domain: string, route: string) {
    return `https://${domain}/i/api/graphql/${route}`;
}

export function endpointType(endpoint: Endpoint): 'gql' | 'v1.1' | 'v2' {
    if (endpoint.url.startsWith('1.1')) {
        return 'v1.1';
    } else if (endpoint.url.startsWith('/i/api/')) {
        return 'v2';
    }

    return 'gql';
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
