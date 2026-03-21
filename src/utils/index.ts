import { Endpoint, EndpointKind } from '../types/internal.js';

export function match<K, V>(key: K, cases: [K | K[], V | (() => V), (boolean | (() => boolean))?][]): V | undefined;
export function match<K, V>(key: K, cases: [K | K[], V | (() => V), (boolean | (() => boolean))?][], or: V | (() => V)): V;

export function match<K, V>(key: K, cases: [K | K[], V | (() => V), (boolean | (() => boolean))?][], or?: V | (() => V)) {
    for (const [k, value, condition] of cases) {
        if ((Array.isArray(k) && k.includes(key)) || key === k) {
            if ((typeof condition === 'boolean' && !condition) || (typeof condition === 'function' && !condition())) {
                continue;
            }

            if (typeof value === 'function') {
                return (value as () => V)();
            }

            return value;
        }
    }

    if (!!or && typeof or === 'function') {
        return (or as () => V)();
    }

    return or;
}



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
    if (endpoint.url.includes('upload.twitter.com')) {
        return EndpointKind.Media;
    } else if (endpoint.url.includes('/i/api/graphql')) {
        return EndpointKind.GraphQL;
    } else if (endpoint.url.includes('/i/api/2')) {
        return EndpointKind.v2;
    }

    return EndpointKind.v11;
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
