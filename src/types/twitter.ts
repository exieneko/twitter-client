import type { Response } from 'undici';
import type { TwitterError } from '../fmt/errors.js';
import type { Flags } from '../flags.js';
import type { Enum } from './utils.js';

/**
 * Response object returned by all methods on `TwitterClient`
 */
export interface TwitterResponse<T extends object> {
    data?: T,
    /** Errors returned by Twitter and thrown during parsing */
    errors: TwitterError[],
    /** Http response received by the server */
    response?: Response
}

/**
 * Additional options for `TwitterClient`
 */
export interface TwitterOptions {
    /** @deprecated Replaced by `logLevel` */
    debug: any,
    /**
     * Set which domain to send requests to
     * 
     * @default 'twitter.com'
     * @since 1.0.0-rc.0
     */
    domain: 'twitter.com' | 'x.com',
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
     * Twitter client language. English is currently the only supported language
     * 
     * @default 'en'
     * @since 1.0.0-rc.0
     */
    language: string,
    /**
     * Log level as a number between 0 and 3
     * 
     * 0. Silent
     * 1. Errors only
     * 2. Errors and warnings
     * 3. Everything
     * 
     * @default 2
     * @since 1.1.0-rc.0
     */
    logLevel: number,
    /**
     * How to handle when a tweet's text length exceeds 280 characters
     * 
     * @default LongTweetBehavior.Force
     * @since 1.0.0-rc.0
     * @deprecated No longer used
     */
    longTweetBehavior: LongTweetBehavior,
    /**
     * Override data sent with requests
     * 
     * @default {}
     * @since 1.0.0
     */
    overrides: {
        /** Overrides sent feature flags for all requests that need it */
        flags?: Flags,
        /** Overrides sent headers. Setting the value to null will delete that header */
        headers?: Record<string, string | null>
    },
    /**
     * Optional http proxy url
     * 
     * @since 1.0.0-rc.0
     */
    proxyUrl?: string
}

/**
 * How to handle when a tweet's text length exceeds 280 characters
 * 
 * @default LongTweetBehavior.Force
 * @deprecated
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
