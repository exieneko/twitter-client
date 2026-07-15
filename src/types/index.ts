import type { Response } from 'undici';
import type { TwitterError } from './error.js';
import type { Enum } from './internal/index.js';

export * from './args.js';
export * from './error.js';

export * from './account.js';
export * from './birdwatch.js';
export * from './community.js';
export * from './discover.js';
export * from './list.js';
export * from './timeline/index.js';
export * from './timeline/slice.js';
export * from './tweet/index.js';
export * from './tweet/card.js';
export * from './tweet/media.js';
export * from './notifications.js';
export * from './search.js';
export * from './user.js';

export * from '../fmt/index.js';

/**
 * Response object returned by all methods on `TwitterClient`
 */
export interface TwitterResponse<T> {
    data?: T,
    /**
     * Errors returned by Twitter and thrown during parsing
     */
    errors: TwitterError[],
    /**
     * Http response received by the server. Always `undefined` unless the `includeResponse` is set to true
     */
    response?: Response
}



/**
 * Account tokens required to log into a Twitter account
 */
export interface TwitterTokens {
    authToken: string,
    csrf: string
}

/**
 * Additional options for `TwitterClient`
 */
export interface TwitterOptions {
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
     * File paths to store data
     * 
     * @default {}
     */
    files: {
        /**
         * Saves account tokens as a JSON array. Use `TwitterClient.fromCookiesFile(filepath)` to initialize the client from this file
         */
        cookies?: string,
        /**
         * Saves response data will as a JSON array
         */
        data?: string
    },
    /**
     * Include the API response as the `response` property on all returned data? This object may include sensitive information like the set-cookie header
     * 
     * @default false
     */
    includeResponse: boolean,
    /**
     * How to handle when a tweet's text length exceeds 280 characters
     * 
     * @default LongTweetBehavior.Force
     */
    longTweetBehavior: LongTweetBehavior,
    /**
     * Optional http proxy url
     */
    proxyUrl?: string,
    /**
     * Silence all errors and logs? Overrides `verbose` option
     * 
     * @default false
     */
    silent: boolean,
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
