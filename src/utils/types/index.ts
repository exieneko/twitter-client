import type { Flags } from '../../flags.js';
import type { Slice } from '../../types/index.js';

export * from './args.js';
export * from './querybuilder.js';

/**
 * Response object containing `errors` and `data` if there are no errors or they aren't fatal
 * 
 * # Examples
 * 
 * ```ts
 * const { errors, data: entries } = await twitter.getTimeline();
 * 
 * if (errors.length === 0) {
 *     console.error(`errors: ${errors}`);
 *     return;
 * }
 * 
 * console.log(entries!.map(entry => entry.content));
 * ```
 * 
 * Or just assume there are no errors:
 * 
 * ```ts
 * const { data: user } = await twitter.getUser('123456');
 * console.log(user?.name);
 * ```
 */
export interface TwitterResponse<T> {
    errors: TwitterError[],
    data?: T
}

/**
 * Represents an error returned by the Twitter API
 * 
 * The `code` property will be `-1` if the error is a caught exception that occured during parsing the response data  
 * If this is the case, all properties except `code` and `message` will be `undefined`. Additionally, `message` will contain the output of `error.stack`
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

export type Timeline<T extends { __typename: string }> = AsyncGenerator<TwitterResponse<Slice<T>>, TwitterResponse<Slice<T>>, unknown>;



export interface Tokens {
    authToken: string,
    csrf: string
}

export interface Options {
    /**
     * Automatically performs `TwitterClient.getSettings()` and `TwitterClient.getUser()` to set `TwitterClient.self` to the currently logged-in user  
     * If set to `false`, `TwitterClient.self` will be `undefined` and needs to be set manually, but will improve initialization time
     * 
     * Provides `twid` cookie if `self` is set
     * 
     * Default: `true`
     */
    autoFetchSelf: boolean,
    /**
     * Controls which domain gets fetched by all requests. This also affects some response data that includes URLs. "x.com" by default
     * 
     * Default: `'twitter.com'`
     */
    domain: 'twitter.com' | 'x.com',
    /**
     * Twitter client language. `'en'` is the default and only officially supported value
     * 
     * Default: `'en'`
     */
    language: string,
    /**
     * What to do when a tweet's text length exceeds 280 characters
     * 
     * + `Force` - Send the request anyway and return the result as normal
     * + `Fail` - The request won't be sent to Twitter at all
     * + `NoteTweet` - Fetches the current user, and creates a note tweet instead, which allows for longer character limits if you're verified
     * + `NoteTweetUnchecked` - Same as `NoteTweet` but no request is made to check if you're verified
     * 
     * Default: `'Force'`
     */
    longTweetBehavior: 'Force' | 'Fail' | 'NoteTweet' | 'NoteTweetUnchecked',
    /**
     * Optional http proxy url
     * 
     * Default: `undefined`
     */
    proxyUrl?: string,
    /**
     * Your user id  
     * If set, any `TwitterClient.getUser` calls will overwrite `TwitterClient.self` if the ids match
     * 
     * Provides `twid` cookie, unless overriden by `TwitterClient.self.id`
     * 
     * Default: `undefined`
     */
    twid?: string,
    /**
     * User-Agent header to send with requests
     * 
     * Default: `'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'`
     */
    userAgent: string,
    /**
     * Show logs in console?
     * 
     * Default: `false`
     */
    verbose: boolean
}

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

export type EndpointKind = 'GraphQL' | 'v1.1' | 'v2' | 'Media';

type OptionalUndefined<T extends object | undefined> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type Params<T extends { params?: object }> = OptionalUndefined<T['params']>;
