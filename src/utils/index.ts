import type { Endpoint, EndpointKind } from '../types/internal.js';

export function v11(route: string, useSubdomain: boolean = true) {
    if (useSubdomain) {
        return `https://api.twitter.com/1.1/${route}`;
    }

    return `https://twitter.com/i/api/1.1/${route}`;
}

export function gql(route: string) {
    return `https://twitter.com/i/api/graphql/${route}`;
}



export function endpointKind(endpoint: Endpoint): EndpointKind {
    if (endpoint.url.includes('/i/api/graphql')) {
        return 'GraphQL';
    } else if (endpoint.url.includes('/i/api/2')) {
        return 'v2';
    }

    return 'v1.1';
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
