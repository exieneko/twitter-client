import { ValidationError } from '../types/index.js';
import type { Type } from '../types/internal/index.js';

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



export function assert<T extends U, U extends Type>(value: U, desiredType: U['__typename'] | U['__typename'][]): T {
    if (typeof desiredType === 'string' && value.__typename !== desiredType) {
        throw new ValidationError(`Failed to assert type ${value.__typename} as ${desiredType}`, {
            field: '__typename',
            value: value.__typename,
            expected: [desiredType]
        });
    } else if (Array.isArray(desiredType) && !desiredType.includes(value.__typename)) {
        throw new ValidationError(`Failed to assert type ${value.__typename} as any of: ${desiredType.join(', ')}`, {
            field: '__typename',
            value: value.__typename,
            expected: desiredType
        });
    }

    return value as T;
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



export function toSearchParams(obj: object) {
    if (!obj || Object.entries(obj).every(([, value]) => value === undefined)) {
        return '';
    }

    return Object.entries(obj)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))}`)
        .join('&');
}
