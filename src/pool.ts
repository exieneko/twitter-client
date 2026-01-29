import { TwitterClient } from './client.js';
import type { ByUsername, CommunityTimelineGetArgs, CursorOnly, BySlug, MediaUploadArgs, Tokens, TweetGetArgs } from './utils/types/index.js';

interface Account {
    id: number,
    client: TwitterClient,
    // TODO: make this read the rate limit header instead of just increasing the count for every action
    uses: number
}

export class TwitterPool {
    private accounts: Account[];

    constructor(tokens: [Tokens, ...Tokens[]]) {
        this.accounts = tokens.map((t, i) => ({
            id: i,
            client: new TwitterClient(t),
            uses: 0
        }));
    }

    private client() {
        const account = this.accounts.toSorted((a, b) => b.uses - a.uses)[0];
        this.accounts[this.accounts.findIndex(({ id }) => id === account.id)].uses++;
        return account.client;
    }



    async getCommunity(id: string) {
        return await this.client().getCommunity(id);
    }

    async getCommunityTweets(id: string, args?: CommunityTimelineGetArgs) {
        return await this.client().getCommunityTweets(id, args);
    }

    async getCommunityMedia(id: string, args?: CursorOnly) {
        return await this.client().getCommunityMedia(id, args);
    }



    async getList(id: string, args?: BySlug) {
        return await this.client().getList(id, args);
    }

    async getListTweets(id: string, args?: CursorOnly) {
        return await this.client().getListTweets(id, args);
    }

    async getListMembers(id: string, args?: CursorOnly) {
        return await this.client().getListMembers(id, args);
    }

    async getListSubscribers(id: string, args?: CursorOnly) {
        return await this.client().getListSubscribers(id, args);
    }



    async getTweet(id: string, args?: TweetGetArgs) {
        return await this.client().getTweet(id, args);
    }

    async getTweetResult(id: string) {
        return await this.client().getTweetResult(id);
    }

    async getTweetResults(ids: [string, ...string[]]) {
        return await this.client().getTweetResults(ids);
    }

    async getHiddenReplies(tweetId: string) {
        return await this.client().getHiddenReplies(tweetId);
    }
    
    async getLikes(tweetId: string) {
        return await this.client().getLikes(tweetId);
    }

    async getRetweets(tweetId: string) {
        return await this.client().getRetweets(tweetId);
    }

    async getQuotedTweets(tweetId: string, args?: CursorOnly) {
        return await this.client().getQuotedTweets(tweetId, args);
    }



    async getUser(id: string, args?: ByUsername) {
        return await this.client().getUser(id, args);
    }

    async getUsers(ids: [string, ...string[]], args?: ByUsername) {
        return await this.client().getUsers(ids, args);
    }
    
    async getUserTweets(id: string, args?: CursorOnly) {
        return await this.client().getUserTweets(id, args);
    }

    async getUserReplies(id: string, args?: CursorOnly) {
        return await this.client().getUserReplies(id, args);
    }

    async getUserMedia(id: string, args?: CursorOnly) {
        return await this.client().getUserMedia(id, args);
    }

    async getUserHighlightedTweets(id: string, args?: CursorOnly) {
        return await this.client().getUserHighlightedTweets(id, args);
    }

    async getFollowing(userId: string, args?: CursorOnly) {
        return await this.client().getFollowing(userId, args);
    }

    async getFollowers(userId: string, args?: CursorOnly) {
        return await this.client().getFollowers(userId, args);
    }

    async getVerifiedFollowers(userId: string, args?: CursorOnly) {
        return await this.client().getVerifiedFollowers(userId, args);
    }

    async getSuperFollowing(userId: string, args?: CursorOnly) {
        return await this.client().getSuperFollowing(userId, args);
    }

    async getAffiliates(userId: string, args?: CursorOnly) {
        return await this.client().getAffiliates(userId, args);
    }

    async getUserLists(id: string, args?: CursorOnly) {
        return await this.client().getUserLists(id, args);
    }



    async upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void) {
        return await this.client().upload(media, args, callback);
    }

    async mediaStatus(id: string) {
        return await this.client().mediaStatus(id);
    }

    async addAltText(id: string, text: string) {
        return await this.client().addAltText(id, text);
    }
}
