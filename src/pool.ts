import { ProxyAgent } from 'undici';
import { slice, TwitterClient } from './client.js';
import type { ByUsername, CommunityTweetsGetArgs, CursorOnly, BySlug, MediaUploadArgs, TweetGetArgs, UserTweetsGetArgs, TwitterResponse, TwitterOptions, SearchTweetArgs, TranslateArgs } from './types/index.js';
import type { Account } from './types/utils.js';
import { Query } from './utils/query.js';
import { Logger } from './utils/log.js';
import { TWITTER_DEFAULT_OPTIONS } from './consts.js';
import { ClientError, ValidationError } from './fmt/errors.js';
import { fetchXDocument } from './utils/request.js';
import ClientTransaction from 'x-client-transaction-id';

/**
 * Asyncronous client utilizing `TwitterClient` instances to make requests to the Twitter browser API using several users
 * 
 * @class
 * @since 0.7.0
 */
export class TwitterPool {
    private static INITIAL_RATE_LIMIT = 500;

    #accounts: Account[] = [];
    /** If `TwitterPool` is initialized with the `fromPromises` method, this will show the options for the first account in the accounts array */
    readonly options: Readonly<TwitterOptions>;

    private constructor(accounts: Account[], options: TwitterOptions) {
        this.#accounts = accounts;
        this.options = structuredClone(options);
    }

    /**
     * Async contructor for `TwitterPool`
     * 
     * @param tokens Account tokens
     * @returns Promise resolving to `TwitterPool`
     * @throws {ClientError} if `ProxyAgent` or `ClientTransaction` can't be created, or if no accounts can be initialized
     */
    static async new(tokens: Record<string, string>[], options?: Partial<TwitterOptions>): Promise<TwitterPool> {
        const opts: TwitterOptions = {
            ...TWITTER_DEFAULT_OPTIONS,
            ...options
        };

        const log = opts.debug > 0 ? new Logger(opts.debug) : undefined;

        let proxyAgent: ProxyAgent | undefined = undefined;
        if (opts.proxyUrl) {
            try {
                proxyAgent = new ProxyAgent(opts.proxyUrl);
                log?.debug(`HTTP proxy ready (${opts.proxyUrl})`)
            } catch (error) {
                throw new ClientError(`Failed to initialize ProxyAgent with url "${opts.proxyUrl}"`, { cause: error, log });
            }
        }

        let transaction: ClientTransaction;
        try {
            const document = await fetchXDocument(opts, proxyAgent);
            transaction = await ClientTransaction.create(document);
            log?.debug('ClientTransaction ready')
        } catch (error) {
            throw new ClientError('Failed to initialize ClientTransaction', {
                cause: error instanceof TypeError ? new ClientError('Failed to get Twitter HTML document', { cause: error }) : error,
                log
            });
        }

        let accounts: Account[] = [];

        for (let index = 0; index < tokens.length; index++) {
            if (!tokens[index] || typeof tokens[index] !== 'object') {
                new ValidationError<unknown>('Invalid tokens object', {
                    field: '*',
                    value: tokens[index],
                    expected: 'object',
                    log
                });
                continue;
            } else if (!tokens[index].auth_token || typeof tokens[index].auth_token !== 'string') {
                new ValidationError<unknown>('auth_token cookie is not a valid string', {
                    field: 'auth_token',
                    value: tokens[index].auth_token,
                    expected: 'string',
                    log
                });
                continue;
            } else if (!tokens[index].ct0 || typeof tokens[index].ct0 !== 'string') {
                new ValidationError<unknown>('ct0 cookie is not a valid string', {
                    field: 'ct0',
                    value: tokens[index].auth_token,
                    expected: 'string',
                    log
                });
                continue;
            }

            accounts.push({
                id: index,
                client: new TwitterClient(tokens[index], opts, { proxyAgent, transaction, log }),
                rateLimitMax: this.INITIAL_RATE_LIMIT,
                rateLimitRemaining: this.INITIAL_RATE_LIMIT,
                rateLimitResetAt: new Date()
            });
        }

        if (accounts.length === 0) {
            throw new ClientError('No accounts could be initialized', {
                cause: new RangeError(`accounts.length 0 out of range: 1..`),
                log
            });
        }

        return new this(accounts, opts);
    }

    /**
     * 
     * @param promises Array of promises that will resolve to `TwitterClient`s
     * @returns Promise resolving to `TwitterPool`
     * @since 1.1.0-rc.1
     */
    static async fromPromises(promises: Promise<TwitterClient>[]): Promise<TwitterPool> {
        const accounts: Account[] = await Promise.all(
            promises.map(async (promise, index) => ({
                id: index,
                client: await promise,
                rateLimitMax: this.INITIAL_RATE_LIMIT,
                rateLimitRemaining: this.INITIAL_RATE_LIMIT,
                rateLimitResetAt: new Date()
            }))
        );

        return new this(accounts, accounts[0].client.options);
    }



    private resetRateLimits() {
        const now = Date.now();

        for (let account of this.#accounts) {
            if (account.rateLimitResetAt.getTime() < now) {
                account.rateLimitRemaining = account.rateLimitMax;
            }
        }
    }

    private async client<T extends object>(fn: (client: TwitterClient) => Promise<TwitterResponse<T>>) {
        this.resetRateLimits();
        this.#accounts.sort((a, b) => b.rateLimitRemaining - a.rateLimitRemaining);

        const result = await fn(this.#accounts[0].client);

        const rateLimit = result.response?.headers.get('x-rate-limit-limit');
        const rateLimitRemaining = result.response?.headers.get('x-rate-limit-remaining');
        const rateLimitReset = result.response?.headers.get('x-rate-limit-reset');

        if (rateLimit) this.#accounts[0].rateLimitMax = Number(rateLimit);
        if (rateLimitRemaining) this.#accounts[0].rateLimitRemaining = Number(rateLimitRemaining);
        if (rateLimitReset) this.#accounts[0].rateLimitResetAt = new Date(Number(rateLimitReset) * 1000);

        delete result.response;
        return result;
    }

    getCommunity(id: string) {
        return this.client(c => c.getCommunity(id));
    }

    getCommunityTweets(id: string, args?: CommunityTweetsGetArgs) {
        return this.client(c => slice(c.getCommunityTweets(id, args)));
    }

    getCommunityMedia(id: string, args?: CursorOnly) {
        return this.client(c => slice(c.getCommunityMedia(id, args)));
    }



    getList(id: string, args?: BySlug) {
        return this.client(c => c.getList(id, args));
    }

    getListTweets(id: string, args?: CursorOnly) {
        return this.client(c => slice(c.getListTweets(id, args)));
    }

    getListMembers(id: string, args?: CursorOnly) {
        return this.client(c => slice(c.getListMembers(id, args)));
    }

    getListSubscribers(id: string, args?: CursorOnly) {
        return this.client(c => slice(c.getListSubscribers(id, args)));
    }



    search(query: string | Query, args?: SearchTweetArgs) {
        return this.client(c => slice(c.search(query, args)));
    }

    searchUsers(query: string, args?: SearchTweetArgs) {
        return this.client(c => slice(c.searchUsers(query, args)));
    }

    searchLists(query: string, args?: SearchTweetArgs) {
        return this.client(c => slice(c.searchLists(query, args)));
    }



    getTweet(id: string, args?: TweetGetArgs) {
        return this.client(c => slice(c.getTweet(id, args)));
    }

    getTweetResult(id: string) {
        return this.client(c => c.getTweetResult(id));
    }

    getTweetResults(ids: string[]) {
        return this.client(c => c.getTweetResults(ids));
    }

    translate(id: string, args?: TranslateArgs) {
        return this.client(c => c.translate(id, args));
    }

    getHiddenReplies(tweetId: string) {
        return this.client(c => slice(c.getHiddenReplies(tweetId)));
    }

    /**
     * @deprecated this will always be empty since you can only see likes on your own tweets
     */
    getLikes(tweetId: string) {
        return this.client(c => slice(c.getLikes(tweetId)));
    }

    getRetweets(tweetId: string) {
        return this.client(c => slice(c.getRetweets(tweetId)));
    }

    getQuotedTweets(tweetId: string, args?: CursorOnly) {
        return this.client(c => slice(c.getQuoteTweets(tweetId, args)));
    }



    getUser(id: string, args?: ByUsername) {
        return this.client(c => c.getUser(id, args));
    }

    getUsers(ids: string[], args?: ByUsername) {
        return this.client(c => c.getUsers(ids, args));
    }
    
    getUserTweets(id: string, args?: UserTweetsGetArgs) {
        return this.client(c => slice(c.getUserTweets(id, args)));
    }

    getUserMedia(id: string, args?: CursorOnly) {
        return this.client(c => slice(c.getUserMedia(id, args)));
    }

    getFollowing(userId: string, args?: CursorOnly) {
        return this.client(c => slice(c.getFollowing(userId, args)));
    }

    getFollowers(userId: string, args?: CursorOnly) {
        return this.client(c => slice(c.getFollowers(userId, args)));
    }

    getVerifiedFollowers(userId: string, args?: CursorOnly) {
        return this.client(c => slice(c.getVerifiedFollowers(userId, args)));
    }

    getSuperFollowing(userId: string, args?: CursorOnly) {
        return this.client(c => slice(c.getSuperFollowing(userId, args)));
    }

    getAffiliates(userId: string, args?: CursorOnly) {
        return this.client(c => slice(c.getAffiliates(userId, args)));
    }

    getUserLists(id: string, args?: CursorOnly) {
        return this.client(c => slice(c.getUserLists(id, args)));
    }



    /**
     * @deprecated
     */
    upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void) {
        return this.client(c => c.upload(media, args, callback));
    }

    /**
     * @deprecated
     */
    mediaStatus(id: string) {
        return this.client(c => c.mediaStatus(id));
    }

    /**
     * @deprecated
     */
    addAltText(id: string, text: string) {
        return this.client(c => c.addAltText(id, text));
    }
}
