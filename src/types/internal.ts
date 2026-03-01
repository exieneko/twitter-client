import type { Flags } from '../flags.js';
import type { Slice } from './index.js';

/**
 * Response object returned by all methods on `TwitterClient`. Contains an `errors` array and optional `data` if the request was successful
 */
export interface TwitterResponse<T> {
    errors: TwitterError[],
    data?: T
}

/**
 * Represents an error returned by the Twitter API. Javascript exceptions and client-side errors use `-1` as `code`
 */
export interface TwitterError {
    message: string,
    locations?: {
        line: number,
        column: number
    }[],
    path?: string[],
    code: number,
    kind?: string, // Validation, Permissions
    name?: string,
    source?: string,
    tracing?: {
        trace_id: string
    }
}

/**
 * `AsyncGenerator` yielding a slice of `T`, where `T` is always an item inside of a timeline entry. Will return an empty slice when done
 * 
 * @example
 * const timeline = twitter.getTimeline();
 * const { value, done } = await timeline.next();
 * 
 * // `value` is always a `TwitterResponse`
 * const { errors, data } = value;
 * 
 * @see {@link TwitterResponse}
 */
export type Timeline<T extends { __typename: string }> = AsyncGenerator<TwitterResponse<Slice<T>>, TwitterResponse<Slice<T>>, unknown>;



export type Enum<T> = T[keyof T];

/**
 * Account tokens required to log into a Twitter account
 */
export interface Tokens {
    authToken: string,
    csrf: string
}

/**
 * Additional options for `TwitterClient`
 */
export interface Options {
    /**
     * Set which domain to send requests to
     * 
     * @default 'twitter.com'
     */
    domain: 'twitter.com' | 'x.com',
    /**
     * Twitter client language. English is currently the only supported language
     * 
     * @default 'en'
     */
    language: string,
    /**
     * How to handle when a tweet's text length exceeds 280 characters
     * 
     * @default LongTweetBehavior.Force
     */
    longTweetBehavior: LongTweetBehavior,
    /**
     * Optional http proxy url
     * 
     * @default undefined
     */
    proxyUrl?: string,
    /**
     * User-Agent header to send with requests
     * 
     * @default 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
     */
    userAgent: string,
    /**
     * Show logs in console?
     * 
     * @default false
     */
    verbose: boolean
}

/**
 * How to handle when a tweet's text length exceeds 280 characters
 * 
 * @enum
 */
export const LongTweetBehavior = {
    /** Send the request anyway */
    Force: 'Force',
    /** Return an error without sending the request */
    Fail: 'Fail',
    /** Send the tweet as a note tweet. This requires a verified account. If `TwitterClient.self` is undefined, it will be set before checking for verification */
    NoteTweet: 'NoteTweet',
    /** Send the tweet as a note tweet, without checking if your account is verified */
    NoteTweetUnchecked: 'NoteTweetUnchecked'
} as const;
export type LongTweetBehavior = Enum<typeof LongTweetBehavior>;



export interface Endpoint<P extends object = {}, V extends object = {}, R extends object = any, T extends object = any> {
    url: string,
    method: 'GET' | 'POST',
    params?: P,
    variables?: V,
    features?: Flags,
    token?: string,
    requiresTransactionId?: boolean,
    parser: (data: R) => T
}

export const EndpointKind = {
    GraphQL: 'GraphQL',
    v11: 'v1.1',
    v2: 'v2',
    Media: 'Media'
} as const;
export type EndpointKind = Enum<typeof EndpointKind>;

type OptionalUndefined<T extends object | undefined> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type Params<T extends { params?: object }> = OptionalUndefined<T['params']>;
