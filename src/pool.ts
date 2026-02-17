import { TwitterClient } from './client.js';
import type { ByUsername, CommunityTimelineGetArgs, CursorOnly, BySlug, MediaUploadArgs, Tokens, TweetGetArgs, UserTweetsGetArgs } from './types/index.js';

interface Account {
    id: number,
    client: TwitterClient,
    // TODO: make this read the rate limit header instead of just increasing the count for every action
    uses: number
}

export class TwitterPool {
    #accounts: Account[] = [];

    private constructor() {}

    static async new(tokens: [Tokens, ...Tokens[]]): Promise<TwitterPool> {
        let pool = new TwitterPool();
        pool.setAccounts(tokens);
        return pool;
    }



    private client() {
        const account = this.#accounts.toSorted((a, b) => b.uses - a.uses)[0];
        this.#accounts[this.#accounts.findIndex(({ id }) => id === account.id)].uses++;
        return account.client;
    }



    private async setAccounts(tokens: [Tokens, ...Tokens[]]) {
        this.#accounts = await Promise.all(
            tokens.map(async (t, i) => ({
                id: i,
                client: await TwitterClient.new(t),
                uses: 0
            }))
        );
    }

    async getCommunity(id: string) {
        return this.client().getCommunity(id);
    }

    async getCommunityTweets(id: string, args?: CommunityTimelineGetArgs) {
        return this.client().getCommunityTweets(id, args);
    }

    async getCommunityMedia(id: string, args?: CursorOnly) {
        return this.client().getCommunityMedia(id, args);
    }



    async getList(id: string, args?: BySlug) {
        return this.client().getList(id, args);
    }

    async getListTweets(id: string, args?: CursorOnly) {
        return this.client().getListTweets(id, args);
    }

    async getListMembers(id: string, args?: CursorOnly) {
        return this.client().getListMembers(id, args);
    }

    async getListSubscribers(id: string, args?: CursorOnly) {
        return this.client().getListSubscribers(id, args);
    }



    async getTweet(id: string, args?: TweetGetArgs) {
        return this.client().getTweet(id, args);
    }

    async getTweetResult(id: string) {
        return this.client().getTweetResult(id);
    }

    async getTweetResults(ids: [string, ...string[]]) {
        return this.client().getTweetResults(ids);
    }

    async getHiddenReplies(tweetId: string) {
        return this.client().getHiddenReplies(tweetId);
    }
    
    async getLikes(tweetId: string) {
        return this.client().getLikes(tweetId);
    }

    async getRetweets(tweetId: string) {
        return this.client().getRetweets(tweetId);
    }

    async getQuotedTweets(tweetId: string, args?: CursorOnly) {
        return this.client().getQuotedTweets(tweetId, args);
    }



    async getUser(id: string, args?: ByUsername) {
        return this.client().getUser(id, args);
    }

    async getUsers(ids: [string, ...string[]], args?: ByUsername) {
        return this.client().getUsers(ids, args);
    }
    
    async getUserTweets(id: string, args?: UserTweetsGetArgs) {
        return this.client().getUserTweets(id, args);
    }

    async getUserMedia(id: string, args?: CursorOnly) {
        return this.client().getUserMedia(id, args);
    }

    async getUserHighlightedTweets(id: string, args?: CursorOnly) {
        return this.client().getUserHighlightedTweets(id, args);
    }

    async getFollowing(userId: string, args?: CursorOnly) {
        return this.client().getFollowing(userId, args);
    }

    async getFollowers(userId: string, args?: CursorOnly) {
        return this.client().getFollowers(userId, args);
    }

    async getVerifiedFollowers(userId: string, args?: CursorOnly) {
        return this.client().getVerifiedFollowers(userId, args);
    }

    async getSuperFollowing(userId: string, args?: CursorOnly) {
        return this.client().getSuperFollowing(userId, args);
    }

    async getAffiliates(userId: string, args?: CursorOnly) {
        return this.client().getAffiliates(userId, args);
    }

    async getUserLists(id: string, args?: CursorOnly) {
        return this.client().getUserLists(id, args);
    }



    async upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void) {
        return this.client().upload(media, args, callback);
    }

    async mediaStatus(id: string) {
        return this.client().mediaStatus(id);
    }

    async addAltText(id: string, text: string) {
        return this.client().addAltText(id, text);
    }
}
