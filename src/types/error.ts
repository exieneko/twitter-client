import { match } from '../utils/index.js';
import type { Enum } from './internal.js';

/**
 * Primary identifier of Twitter errors
 * 
 * @enum
 */
export const TwitterErrorCode = {
    TweetAlreadyLiked: 139,
    AutomatedRequest: 226,
    RateLimitReached: 344,

    /**
     * Fallback
     * 
     * @default
     */
    Unknown: 0,
    /** Feature is not implemented */
    NotImplemented: 1001,
    /** Tweet exceeds 280 characters and options to proceed are turned off */
    InvalidTweetTextLength: 1010,
    /** Tweet media array length exceeds 4 */
    InvalidMediaCount: 1011,
    InvalidPollChoicesCount: 1012,
    InvalidVoteIndex: 1013
} as const;
export type TwitterErrorCode = Enum<typeof TwitterErrorCode>;

/**
 * @enum
 */
export const TwitterErrorKind = {
    Validation: 'Validation',
    Permissions: 'Permissions',
    Other: 'Other',
    Unknown: 'Unknown'
} as const;
export type TwitterErrorKind = Enum<typeof TwitterErrorKind>;

/**
 * Error returned by the Twitter API or thrown during parsing
 * 
 * @class
 */
export class TwitterError extends Error {
    public static DEFAULT_NAME = 'Unknown';
    public static DEFAULT_MESSAGE = 'An unknown error occured';

    code: TwitterErrorCode = TwitterErrorCode.Unknown;
    kind: TwitterErrorKind = TwitterErrorKind.Unknown;
    name: string = TwitterError.DEFAULT_NAME;
    /** Error message in the language selected during client initialization */
    message: string = TwitterError.DEFAULT_MESSAGE;
    stack?: string;
    cause?: unknown;
    /**
     * Path for where in the object the error occured
     */
    path?: string[];

    constructor();
    constructor(message: string);
    constructor(value: Record<string, any>);
    constructor(code: TwitterErrorCode, options?: TwitterErrorOptions);

    constructor(value?: TwitterErrorCode | Record<string, any> | string, options?: TwitterErrorOptions) {
        if (!value) {
            // default
            super(TwitterError.DEFAULT_MESSAGE);
            return;
        } else if (typeof value === 'number') {
            // create object from code only
            let [kind, message]: [TwitterErrorKind, string] = match(value, [
                [TwitterErrorCode.NotImplemented, [TwitterErrorKind.Other, 'This functionality is not implemented yet']],
                [TwitterErrorCode.InvalidTweetTextLength, [TwitterErrorKind.Validation, 'Tweet exceeded limit of 280 characters']],
                [TwitterErrorCode.InvalidMediaCount, [TwitterErrorKind.Validation, 'Tweet exceeded limit of 4 media attachments']],
                [TwitterErrorCode.InvalidPollChoicesCount, [TwitterErrorKind.Validation, 'Polls must have 2-4 choices']],
                [TwitterErrorCode.InvalidVoteIndex, [TwitterErrorKind.Validation, 'Polls must have 2-4 choices']],
            ], [TwitterErrorKind.Unknown, TwitterError.DEFAULT_MESSAGE]);

            if (options?.data) {
                message += ` (found: ${options.data})`;
            }

            const name = Object.entries(TwitterErrorCode).find(([, v]) => v === value)?.[0];

            super(message, { cause: options?.cause });

            this.code = value;
            this.kind = kind;
            if (name) this.name = name;
            this.message = message;
        } else {
            // create object from api response data
            const message = (typeof value === 'string' ? value : value.message) || TwitterError.DEFAULT_MESSAGE;

            super(message);
            this.message = message;

            if (typeof value !== 'string') {
                if (value.code) this.code = Number(value.code) as TwitterErrorCode;
                if (value.kind) this.kind = value.kind;
                if (value.name) this.name = value.name;
                if (value.path) this.path = value.path;
            }
        }

        if (options?.stack) {
            this.stack = options.stack;
        }

        if (!this.stack) {
            Error.captureStackTrace?.(this, TwitterError);
        }

        if (!this.stack) {
            this.stack = new Error(this.message, { cause: options?.cause }).stack;
        }

        if (options?.cause) this.cause = options?.cause;
        if (options?.path) this.path = options?.path;
    }

    /**
     * Creates a `TwitterError` array, usually from the `errors` property returned in most response objects
     * 
     * @param values Array
     * @returns `TwitterError` array
     */
    static from(values?: any[]): TwitterError[] {
        if (!values || !Array.isArray(values) || values.length < 1) {
            return [];
        }

        return values.map(value => new this(value));
    }

    /**
     * Returns `true` if the error is a Javascript error returned during parsing instead of a Twitter API error
     */
    isClientError(): boolean {
        return this.code >= 1000;
    }
}

export interface TwitterErrorOptions extends ErrorOptions {
    /** Additional optional data shown in some error messages */
    data?: string | number | boolean,
    stack?: string,
    path?: string[]
}
