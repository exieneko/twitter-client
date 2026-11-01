import type { TwitterClient } from '../client.js';
import { PUBLIC_TOKEN } from '../consts.js';
import { Flags } from '../flags.js';
import type { TwitterFormatter } from '../fmt/index.js';

export type RequiredBy<T extends object, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type PartialBy<T extends object, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type PartialUndefined<T extends object | undefined> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export interface Type<K extends string = string> {
    readonly __typename: K
}

export type AsyncConstructor<This, T = Record<string, any>, Opts extends Record<string, any> | null = null> = [Opts] extends [null]
    ? (fmt: TwitterFormatter, value: T) => Promise<This>
    : (fmt: TwitterFormatter, value: T, opts: Opts) => Promise<This>;

export type EndpointParams<E extends Endpoint> = PartialUndefined<E['_params']>;
export type MaybeType<T extends string = string> = (Type<T> & Record<string, any>) | undefined;



export interface Account {
    id: number,
    client: TwitterClient,
    rateLimitMax: number,
    rateLimitRemaining: number,
    rateLimitResetAt: Date
}



type Method = 'GET' | 'POST';

export type EndpointOptions = {
    url: string,
    method: Method,
    variables?: Record<string, any>,
    features?: Flags,
    token?: string
}

export class Endpoint<T = any, P extends object = {}> implements EndpointOptions {
    url: string;
    method: Method;
    variables?: Record<string, any>;
    features?: Flags;
    token: string;
    _params: P = {} as P;

    constructor(options: EndpointOptions, public format: (fmt: TwitterFormatter, value: Record<string, any>) => T | Promise<T>) {
        this.url = options.url;
        this.method = options.method;
        this.variables = options.variables;
        this.features = options.features;
        this.token = options.token || PUBLIC_TOKEN;
    }

    get(url: string, body?: string) {
        if (this.method === 'GET' && body && body.length > 0) {
            return url + '?' + body;
        }

        return url;
    }

    post(body?: any): string | undefined {
        if (this.method === 'POST' && body) {
            if (this.kind() === EndpointType.GraphQL) {
                return JSON.stringify(body);
            }
            return String(body);
        }
    }

    kind(): EndpointType {
        if (this.url.includes('upload.twitter.com')) {
            return EndpointType.Media;
        } else if (this.url.includes('/i/api/graphql')) {
            return EndpointType.GraphQL;
        } else if (this.url.includes('/i/api/2')) {
            return EndpointType.v2;
        } else if (this.url.includes('api.twitter.com/2/')) {
            return EndpointType.v2Alt;
        }

        return EndpointType.v11;
    }

    toJSON(): EndpointOptions {
        return {
            url: this.url,
            method: this.method,
            variables: this.variables,
            features: this.features,
            token: this.token
        };
    }
}

export enum EndpointType {
    GraphQL = 'GraphQL',
    v11 = 'v11',
    v2 = 'v2',
    v2Alt = 'v2Alt',
    Media = 'Media'
}

export interface EndpointGroup {
    [key: string]: Endpoint
}



/**
 * Represents a range of numbers
 * 
 * @since 1.0.0-rc.0
 */
export class Range {
    start: number;
    end: number;
    inclusive: boolean;

    /**
     * Creates a range from numbers
     * 
     * @param start Start number, allows `-Infinity`
     * @param end End number, allows `Infinity`
     * @param [inclusive] Should the range include `end`?
     * @throws {RangeError} if `start` or `end` is NaN, or if an inclusive range has no end (1..=)
     */
    constructor(start: number, end: number, inclusive?: boolean);
    /**
     * Creates a Range from a string or possible JSON data
     * 
     * @param range Another `Range` or a `RangeString` representing one
     * @throws {RangeError} if `start` or `end` is NaN, or if an inclusive range has no end (1..=)
     * @see {@linkcode RangeString}
     */
    constructor(range: RangeLike);

    constructor(...args: [number | null, number | null, boolean?] | [RangeLike]) {
        let start: number;
        let end: number;
        let inclusive = false;

        if (typeof args[0] === 'string') {
            let [first, second] = args[0].split('..', 2);

            if (second.startsWith('=')) {
                inclusive = true;
                second = second.replace(/^\=/, '');
            }

            start = first.trim() === '' ? -Infinity : Number(first);
            end = second.trim() === '' ? Infinity : Number(second);

            if (Number.isNaN(end)) {
                inclusive = false;
            }
        } else if (args[0] instanceof Range) {
            ({ start, end, inclusive } = args[0]);
        } else {
            start = args[0] ?? -Infinity;
            end = args[1] ?? Infinity;
            inclusive = !!args[2];
        }

        if (Number.isNaN(start) || Number.isNaN(end)) {
            throw new RangeError('Range start or end can\'t be NaN');
        }

        if (!Number.isFinite(start) && inclusive) {
            throw new RangeError('Inclusive ranges must have an end');
        }

        this.start = start;
        this.end = end;
        this.inclusive = inclusive;
    }

    includes(num: number) {
        return num >= this.start && (num < this.end || (num <= this.end && this.inclusive));
    }

    isEmpty() {
        return this.start > this.end || (this.start >= this.end && this.inclusive);
    }

    /**
     * Turns range into an array
     * 
     * @param [fractionDigits] Number of decimal places used for a step
     * @param [limit] Replace `Infinity` with this number
     * @returns Array of numbers
     * @throws {RangeError} if `fractionDigits` is out of range `0..=20` or if `limit` is not a positive finite number
     */
    toArray(fractionDigits = 0, limit = 1 << 10): number[] {
        if (Number.isNaN(fractionDigits) || !Number.isInteger(fractionDigits) || !new Range('0..=20').includes(fractionDigits)) {
            throw new RangeError('fractionDigits must be a non-negative integer in range of 0..=20');
        }

        if (Number.isNaN(limit) || !Number.isFinite(limit) || limit < 0) {
            throw new RangeError('limit must be a positive finite number');
        }

        if (this.start > this.end) {
            return [];
        }

        let start = this.start;
        let end = this.end;

        if (start === -Infinity) {
            start = -limit;
        } else if (start === Infinity) {
            start = limit;
        }

        if (end === -Infinity) {
            end = -limit;
        } else if (end === Infinity) {
            end = limit;
        }

        const multiplier = 10 ** fractionDigits;
        const from = Math.round(start * multiplier);
        const to = Math.round(end * multiplier);

        let result: number[] = [];

        if (from === to) {
            if (this.inclusive) {
                result.push(from / multiplier);
            }
            return result;
        }

        for (let value = from; value < to; value += 1) {
            result.push(value / multiplier);
        }

        if (this.inclusive) {
            result.push(to / multiplier);
        }

        return result;
    }

    toString(radix?: number) {
        const start = this.start.toString(radix).repeat(Number(Number.isFinite(this.start)));
        const end = this.end.toString(radix).repeat(Number(Number.isFinite(this.end)));

        return `${start}..${'='.repeat(Number(this.inclusive))}${end}` as RangeString;
    }

    protected toJSON() {
        return this.toString() as RangeString;
    }
}

/**
 * Matches any string that can represent a `Range`
 * 
 * @example <caption>Non-inclusive range</caption>
 * '1..3'
 * 
 * @example <caption>Inclusive range</caption>
 * '1..=3'
 * 
 * @example <caption>Inclusive range</caption>
 * '1..=3'
 * 
 * @example <caption>Range with no start</caption>
 * '..5'
 * 
 * @example <caption>Range with no end</caption>
 * '5..'
 * 
 * @example <caption>Range from `-Infinity` to `Infinity`</caption>
 * '..'
 * 
 * @example <caption>Inclusive range with floats</caption>
 * '1.4..=4.6'
 */
export type RangeString = `${number | ''}..${number | ''}` | `${number | ''}..=${number}`;
export type RangeLike = Range | RangeString;
