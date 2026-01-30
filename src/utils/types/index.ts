import type { Flags } from '../../flags.js';

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



export interface Tokens {
    authToken: string,
    csrf: string
}

export interface Options {
    /** Controls which domain gets fetched by all requests. This also affects some response data that includes URLs. "x.com" by default */
    domain: 'twitter.com' | 'x.com',
    /** Twitter client language. `en` is the default and only officially supported value */
    language: string,
    /**
     * What to do when a tweet's text length exceeds 280 characters
     * 
     * + `Force` - Send the request anyway and return the result as normal (default)
     * + `Fail` - The request won't be sent to Twitter at all
     * + `NoteTweet` - Fetches the current user, and creates a note tweet instead, which allows for longer character limits if you're verified
     * + `NoteTweetUnchecked` - Same as `NoteTweet` but no request is made to check if you're verified
     */
    longTweetBehavior: 'Force' | 'Fail' | 'NoteTweet' | 'NoteTweetUnchecked',
    /** Show logs in console? */
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
