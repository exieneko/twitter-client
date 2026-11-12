import type { Response } from 'undici';
import type { TwitterError } from '../fmt/errors.js';
import type { Flags } from '../flags.js';

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
 */
export enum LongTweetBehavior {
    /** Send the request anyway */
    Force = 'Force',
    /** Return an error without sending the request */
    Fail = 'Fail',
    /** Send the tweet as a note tweet. This requires a verified account. If `TwitterClient.self` is undefined, it will be set before checking for verification */
    NoteTweet = 'NoteTweet',
    /** Send the tweet as a note tweet, without checking if your account is verified */
    NoteTweetUnchecked = 'NoteTweetUnchecked'
}
