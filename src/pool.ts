import { slice, TwitterClient } from './client.js';
import type { ByUsername, CommunityTweetsGetArgs, CursorOnly, BySlug, MediaUploadArgs, TwitterTokens, TweetGetArgs, UserTweetsGetArgs, TwitterResponse, TwitterOptions, SearchTweetArgs, ListKind, UserKind, TweetKind } from './types/index.js';
import type { Account } from './types/internal/index.js';
import { Query } from './utils/query.js';
import { QueryBuilder } from './utils/querybuilder.js';

/**
 * Asyncronous client utilizing `TwitterClient` instances to make requests to the Twitter browser API using several users
 * 
 * @class
 * @since 0.7.0
 */
export class TwitterPool {
    private static INITIAL_RATE_LIMIT = 500;

    #accounts: Account[] = [];

    private constructor(accounts: Account[]) {
        this.#accounts = accounts;
    }

    /**
     * Async contructor for `TwitterPool`
     * 
     * @param tokens Account tokens
     * @returns Promise resolving to `TwitterPool`
     */
    static async new(tokens: TwitterTokens[], options?: Partial<TwitterOptions>): Promise<TwitterPool> {
        const accounts = await this._accounts(tokens, options);
        return new this(accounts);
    }

    private static async _accounts(tokens: TwitterTokens[], options?: Partial<TwitterOptions>): Promise<Account[]> {
        return await Promise.all(
            tokens.map(async (tokens, index) => ({
                id: index,
                client: await TwitterClient.new(tokens, options),
                rateLimitMax: this.INITIAL_RATE_LIMIT,
                rateLimitRemaining: this.INITIAL_RATE_LIMIT,
                rateLimitResetAt: new Date()
            } satisfies Account))
        );
    }



    private resetRateLimits() {
        const now = Date.now();

        for (let account of this.#accounts) {
            if (account.rateLimitResetAt.getTime() < now) {
                account.rateLimitRemaining = account.rateLimitMax;
            }
        }
    }

    private async client<T>(fn: (client: TwitterClient) => Promise<TwitterResponse<T>>) {
        this.resetRateLimits();
        this.#accounts.sort((a, b) => b.rateLimitRemaining - a.rateLimitRemaining);

        const result = await fn(this.#accounts[0].client);

        const rateLimit = result.response?.headers.get('x-rate-limit-limit');
        const rateLimitRemaining = result.response?.headers.get('x-rate-limit-remaining');
        const rateLimitReset = result.response?.headers.get('x-rate-limit-reset');

        if (rateLimit) this.#accounts[0].rateLimitMax = Number(rateLimit);
        if (rateLimitRemaining) this.#accounts[0].rateLimitRemaining = Number(rateLimitRemaining);
        if (rateLimitReset) this.#accounts[0].rateLimitResetAt = new Date(Number(rateLimitReset) * 1000);

        return result;
    }

    getCommunity(id: string | bigint) {
        return this.client(c => c.getCommunity(id));
    }

    getCommunityTweets(id: string | bigint, args?: CommunityTweetsGetArgs) {
        return this.client(c => slice(c.getCommunityTweets(id, args)));
    }

    getCommunityMedia(id: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getCommunityMedia(id, args)));
    }



    getList(id: string | bigint, args?: BySlug) {
        return this.client(c => c.getList(id, args));
    }

    getListTweets(id: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getListTweets(id, args)));
    }

    getListMembers(id: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getListMembers(id, args)));
    }

    getListSubscribers(id: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getListSubscribers(id, args)));
    }


    search(query: string | Query | QueryBuilder, args?: SearchTweetArgs) {
        return this.client(c => slice(c.search(query, args)));
    }

    searchUsers(query: string, args?: SearchTweetArgs) {
        return this.client(c => slice(c.searchUsers(query, args)));
    }

    searchLists(query: string, args?: SearchTweetArgs) {
        return this.client(c => slice(c.searchLists(query, args)));
    }



    getTweet(id: string | bigint, args?: TweetGetArgs) {
        return this.client(c => slice(c.getTweet(id, args)));
    }

    getTweetResult(id: string | bigint) {
        return this.client(c => c.getTweetResult(id));
    }

    getTweetResults(ids: (string | bigint)[]) {
        return this.client(c => c.getTweetResults(ids));
    }

    getHiddenReplies(tweetId: string | bigint) {
        return this.client(c => slice(c.getHiddenReplies(tweetId)));
    }
    
    getLikes(tweetId: string | bigint) {
        return this.client(c => slice(c.getLikes(tweetId)));
    }

    getRetweets(tweetId: string | bigint) {
        return this.client(c => slice(c.getRetweets(tweetId)));
    }

    getQuotedTweets(tweetId: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getQuoteTweets(tweetId, args)));
    }



    getUser<T extends ByUsername>(id: T['byUsername'] extends true ? string : string | bigint, args?: T) {
        return this.client(c => c.getUser(id, args));
    }

    getUsers<T extends ByUsername>(ids: T['byUsername'] extends true ? string[] : (string | bigint)[], args?: T) {
        return this.client(c => c.getUsers(ids, args));
    }
    
    getUserTweets(id: string | bigint, args?: UserTweetsGetArgs) {
        return this.client(c => slice(c.getUserTweets(id, args)));
    }

    getUserMedia(id: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getUserMedia(id, args)));
    }

    getUserHighlightedTweets(id: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getUserHighlightedTweets(id, args)));
    }

    getFollowing(userId: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getFollowing(userId, args)));
    }

    getFollowers(userId: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getFollowers(userId, args)));
    }

    getVerifiedFollowers(userId: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getVerifiedFollowers(userId, args)));
    }

    getSuperFollowing(userId: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getSuperFollowing(userId, args)));
    }

    getAffiliates(userId: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getAffiliates(userId, args)));
    }

    getUserLists(id: string | bigint, args?: CursorOnly) {
        return this.client(c => slice(c.getUserLists(id, args)));
    }



    upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void) {
        return this.client(c => c.upload(media, args, callback));
    }

    mediaStatus(id: string | bigint) {
        return this.client(c => c.mediaStatus(id));
    }

    addAltText(id: string | bigint, text: string) {
        return this.client(c => c.addAltText(id, text));
    }
}
