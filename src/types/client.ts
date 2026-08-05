import { Response } from 'undici';
import type { TwitterError } from '../fmt/errors.js';
import type { Enum } from './internal/index.js';
import type { Flags } from '../flags.js';

/**
 * Response object returned by all methods on `TwitterClient`
 */
export interface TwitterResponse<T extends object> {
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
     * Debug level expressed as a number
     * 
     * Right to left: errors, warnings, info, debug, trace
     * 
     * @default 0b00011
     * @since 1.0.0-rc.1
     */
    debug: number,
    /**
     * Set which domain to send requests to
     * 
     * @default 'twitter.com'
     * @since 1.0.0-rc.0
     */
    domain: 'twitter.com' | 'x.com',
    /**
     * Twitter client language. English is currently the only supported language
     * 
     * @default 'en'
     * @since 1.0.0-rc.0
     */
    language: string,
    /**
     * File paths to store data
     * 
     * @default {}
     * @since 1.0.0-rc.0
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
     * @since 1.0.0-rc.0
     */
    includeResponse: boolean,
    /**
     * How to handle when a tweet's text length exceeds 280 characters
     * 
     * @default LongTweetBehavior.Force
     * @since 1.0.0-rc.0
     */
    longTweetBehavior: LongTweetBehavior,
    /**
     * Override data sent with requests
     * 
     * @default {}
     * @since 1.0.0-rc.1
     */
    overrides: {
        flags?: Flags,
        headers?: Record<string, string>
    },
    /**
     * Optional http proxy url
     * 
     * @since 1.0.0-rc.0
     */
    proxyUrl?: string,
    /**
     * User-Agent header to send with requests
     * 
     * @deprecated Replaced by `overrides.headers`
     * @default 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
     * @since 1.0.0-rc.0
     */
    userAgent?: string
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
