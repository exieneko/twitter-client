import logger from 'node-color-log';
import { hrtime } from 'process';
import { fetch, FormData, ProxyAgent } from 'undici';
import { ClientTransaction, handleXMigration } from 'x-client-transaction-id';

import { EMPTY_SLICE, ENDPOINTS, HEADERS, MAX_ACCEPTABLE_REQUEST_TIME, MAX_TIMELINE_ITERATIONS, PUBLIC_TOKEN, TWEET_CHARACTER_LIMIT } from './consts.js';
import { BirdwatchNoteSource, BirthDateVisibility, CommunityTweetsOrder, ReplyPermission, TweetOrder, TwitterError, TwitterErrorCode, type BirdwatchRateNoteArgs, type BlockedUsersGetArgs, type BySlug, type ByUsername, type CommunityTweetsGetArgs, type CursorOnly, type ListCreateArgs, type ListKind, type Media, type MediaUploadArgs, type Notification, type NotificationGetArgs, type Options, type ScheduledTweetCreateArgs, type SearchArgs, type Slice, type ThreadTweetArgs, type Timeline, type TimelineGetArgs, type Tokens, type Tweet, type TweetCreateArgs, type TweetGetArgs, type TweetKind, type TweetVoteArgs, type TwitterResponse, type UnsentTweetsGetArgs, type UpdateProfileArgs, type User, type UserKind, type UserTweetsGetArgs } from './types/index.js';
import { EndpointKind, type Endpoint, type Params, type Type } from './types/internal.js';
import { endpointKind, match, toSearchParams } from './utils/index.js';
import type { QueryBuilder } from './utils/querybuilder.js';

/**
 * Shorthand for quickly getting only the current slice of a timeline, then discarding the generator. If you want to reuse the generator, call `timeline.next()`
 * 
 * Previously, all methods on `TwitterClient` that fetched a timeline returned only one slice, now they're generators. This function can be used to restore that behavior if needed
 * 
 * @example 
 * import { slice, TwitterClient } from '@exieneko/twitter-client';
 * 
 * const twitter = await TwitterClient.new(...);
 * const { errors, data } = await slice(twitter.getTweet('123456789', { sort: 'Likes' }));
 * 
 * @param timeline The timeline returned by the generator function
 * @returns Current slice of `T`
 * @since v1.0.0-rc.1
 */
export async function slice<T extends { __typename: string }>(timeline: Timeline<T>): Promise<TwitterResponse<Slice<T>>> {
    const { value } = await timeline.next();
    await timeline.return(EMPTY_SLICE);
    return value;
}



/**
 * Asyncronous client used to make requests to the Twitter browser API while logged in as a Twitter user
 * 
 * @class
 * @since v0.1.0
 */
export class TwitterClient {
    #transaction: ClientTransaction;
    #tokens: Tokens;
    #options: Options;

    /**
     * The current user
     * 
     * @since 1.0.0-rc.1
     */
    self?: User;

    constructor(transaction: ClientTransaction, tokens: Tokens, options: Options) {
        this.#transaction = transaction;
        this.#tokens = tokens;
        this.#options = options;

        if (this.#options.language.toLowerCase().startsWith('en-')) {
            this.#options.language = 'en';
        }
    }

    /**
     * Fetches the x.com homepage and creates a `ClientTransaction` object, which is used to generate the `x-client-transaction-id` header for endpoints that require it
     * 
     * @returns Promise resolving to a `ClientTransaction`
     * @since v1.0.0-rc.1
     */
    static async _transaction(): Promise<ClientTransaction> {
        const document = await handleXMigration();
        const transaction = await ClientTransaction.create(document);
        return transaction;
    }

    /**
     * Async constructor for `TwitterClient`
     * 
     * @constructor
     * @param tokens Your Twitter account's login tokens
     * @param [options] Additional options
     * @returns Promise resolving to `TwitterClient`
     * @since v1.0.0-rc.1
     */
    static async new(tokens: Tokens, options?: Partial<Options>): Promise<TwitterClient> {
        const client = new TwitterClient(
            await TwitterClient._transaction(),
            tokens,
            {
                domain: 'twitter.com',
                language: 'en',
                longTweetBehavior: 'Force',
                proxyUrl: undefined,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                verbose: false,
                ...options
            }
        );

        client.log('Initialized TwitterClient');

        if (client.#options.language !== 'en') {
            client.warn('Setting `language` to values other than "en" may have unexpected effects - if you find any bugs, please open an issue here: https://github.com/exieneko/twitter-client/issues <3');
        }

        return client;
    }



    private log(message: string) {
        if (this.#options.verbose) {
            logger.info(message);
        }
    }

    private warn(message: string) {
        if (this.#options.verbose) {
            logger.warn(message);
        }
    }

    private error(message: string) {
        if (this.#options.verbose) {
            logger.error(message);
        }
    }



    private async getTransactionId(endpoint: Endpoint): Promise<string> {
        const path = endpoint.url.replace(/.*twitter\.com\//, '/');
        const transactionId = await this.#transaction.generateTransactionId(endpoint.method, path);

        this.log(`Generated x-client-transaction-id for ${endpoint.method} ${path} (${transactionId})`);
        return transactionId;
    }

    private getHeaders(token?: string, endpointKind: EndpointKind = EndpointKind.GraphQL, url?: string, transactionId?: string): Record<string, string> {
        const tokenHeaders = () => {
            return {
                'x-csrf-token': this.#tokens.csrf,
                cookie: !!this.self?.id
                    ? `auth_token=${this.#tokens.authToken}; ct0=${this.#tokens.csrf}; twid=u%3D${this.self.id}; lang=${this.#options.language}`
                    : `auth_token=${this.#tokens.authToken}; ct0=${this.#tokens.csrf}; lang=${this.#options.language}`
            };
        }

        let result: Record<string, string> = transactionId ? { 'x-client-transaction-id': transactionId } : {};

        const contentType = endpointKind === EndpointKind.GraphQL
            ? 'application/json'
        : endpointKind === EndpointKind.Media
            ? undefined
            : 'application/x-www-form-urlencoded';

        if (contentType) {
            Object.defineProperty(result, 'Content-Type', { configurable: true, enumerable: true, writable: true, value: contentType });
        }

        return {
            ...HEADERS,
            'Accept-Language': `${this.#options.language === 'en' ? 'en-US,en' : this.#options.language};q=0.5`,
            Host: url
                ? (url?.replace('https://', '').replace('.com/', '') + '.com').replace('twitter.com', this.#options.domain)
                : this.#options.domain,
            Origin: `https://${this.#options.domain}`,
            Referer: `https://${this.#options.domain}/`,
            authorization: token || PUBLIC_TOKEN,
            'User-Agent': this.#options.userAgent,
            ...tokenHeaders(),
            ...result
        };
    }

    private getProxyAgent() {
        if (!!this.#options.proxyUrl) {
            return new ProxyAgent(this.#options.proxyUrl);
        }
    }

    private async fetch<T extends Endpoint>(endpoint: T, params?: Params<T>): Promise<TwitterResponse<ReturnType<T['parser']>>> {
        const headers = this.getHeaders(
            endpoint.token,
            endpointKind(endpoint),
            endpoint.url,
            endpoint.requiresTransactionId
                ? await this.getTransactionId(endpoint)
                : undefined
        );

        const url = endpoint.url.replace('twitter.com', this.#options.domain);

        try {
            const start = hrtime.bigint();
            this.log(`${endpoint.method} ${url}`);

            const body = new URLSearchParams({ ...endpoint.variables, ...params }).toString();
            const response = await (endpointKind(endpoint) === EndpointKind.GraphQL
                ? (endpoint.method === 'GET'
                    ? fetch(url + toSearchParams({ variables: { ...endpoint.variables, ...params }, features: endpoint.features }), {
                        method: endpoint.method,
                        headers,
                        dispatcher: this.getProxyAgent()
                    })
                    : fetch(url, {
                        method: endpoint.method,
                        headers,
                        body: JSON.stringify({
                            variables: { ...endpoint.variables, ...params },
                            features: endpoint.features,
                            queryId: endpoint.url.split('/', 1)[0]
                        }),
                        dispatcher: this.getProxyAgent()
                    })
                )
                : fetch(endpoint.method === 'GET' && body ? `${url}?${body}` : url, {
                    method: endpoint.method,
                    headers,
                    body: endpoint.method === 'POST' && body ? body : undefined,
                    dispatcher: this.getProxyAgent()
                })
            );

            const elapsed = Number(hrtime.bigint() - start) / 1e6;
            const text = `${response.status} ${response.statusText} in ${Math.floor(elapsed)}ms`;
            if (response.ok && elapsed > MAX_ACCEPTABLE_REQUEST_TIME) {
                this.warn(text);
            } else if (response.ok) {
                this.log(text);
            } else {
                this.error(text);
            }

            const data: Parameters<Endpoint['parser']>[0] = await response.json();

            if (data?.errors && !data.data) {
                return {
                    errors: TwitterError.from(data.errors)
                };
            }

            try {
                return {
                    errors: TwitterError.from(data?.errors),
                    data: endpoint.parser(data)
                };
            } catch (error: any) {
                return {
                    errors: [new TwitterError()]
                };
            }
        } catch (error: any) {
            return {
                errors: [new TwitterError()]
            };
        }
    }

    private async* getSlice<T extends { __typename: string }, U extends CursorOnly>(args: U | undefined, callback: (args: U) => Promise<TwitterResponse<Slice<T>>>): Timeline<T> {
        const a = (args ?? {}) as U;

        let iterations = 0;
        let cursors: string[] = [];

        while (cursors.length < 2 ? iterations < MAX_TIMELINE_ITERATIONS : cursors.at(-1) !== cursors.at(-2)) {
            const currentArgs: U = { ...a, cursor: cursors.at(-1) ?? args?.cursor };
            const next = await callback(currentArgs);

            iterations++;
            if (next.data?.cursors.next) {
                cursors.push(next.data.cursors.next);
            }

            yield next;
        }

        return EMPTY_SLICE;
    }



    /**
     * Sets the {@link TwitterClient.self} property and returns its value
     * 
     * @returns User
     * @since v1.0.0-rc.1
     */
    async setSelf(): Promise<TwitterResponse<User>> {
        const { errors, data: settings } = await this.getSettings();

        if (!settings) {
            return { errors };
        }

        const { errors: errors2, data: user } = await this.getUser(settings.username, { byUsername: true });

        if (!user || user.__typename !== 'User') {
            return { errors: errors2 };
        }

        this.self = user as User;

        return {
            errors: [...errors, ...errors2],
            data: this.self
        };
    }



    /**
     * Get users you've blocked
     * 
     * @param [args] {@link BlockedUsersGetArgs}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getBlockedUsers(args?: BlockedUsersGetArgs): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, this.getBlockedUsersSlice)) yield slice;
        return EMPTY_SLICE;
    }

    private async getBlockedUsersSlice(args?: BlockedUsersGetArgs) {
        if (args?.imported) {
            return await this.fetch(ENDPOINTS.BlockedAccountsImported, { cursor: args?.cursor });
        }

        return await this.fetch(ENDPOINTS.BlockedAccountsAll, { cursor: args?.cursor });
    }

    /**
     * Get users you've muted
     * 
     * @param [args] Cursor only
     * @yields Slice of accounts
     * @since v0.1.0
     */
    async* getMutedUsers(args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, this.getMutedUsersSlice)) yield slice;
        return EMPTY_SLICE;
    }

    private async getMutedUsersSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.MutedAccounts, args);
    }

    /**
     * Get your account settings
     * 
     * @returns Settings
     * @since v0.1.0
     */
    async getSettings() {
        return await this.fetch(ENDPOINTS.account_settings);
    }

    /**
     * Update data on your profile
     * 
     * @param args {@link UpdateProfileArgs}
     * @returns Success status
     * @since v0.1.0
     */
    async updateProfile(args: UpdateProfileArgs) {
        return await this.fetch(ENDPOINTS.account_update_profile, {
            name: args.name,
            description: args.description,
            location: args.location,
            url: args.url,
            birthdate_year: args.birthday.getFullYear(),
            birthdate_month: args.birthday.getMonth() + 1,
            birthdate_day: args.birthday.getDate(),
            birthdate_year_visibility: match(args.birthYearVisibility, [
                [BirthDateVisibility.Private, 'self'],
                [BirthDateVisibility.Mutuals, 'mutualfollow'],
                [BirthDateVisibility.Followers, 'followers'],
                [BirthDateVisibility.Following, 'following'],
            ] as const, 'public'),
            birthdate_visibility: match(args.birthDayVisibility, [
                [BirthDateVisibility.Private, 'self'],
                [BirthDateVisibility.Mutuals, 'mutualfollow'],
                [BirthDateVisibility.Followers, 'followers'],
                [BirthDateVisibility.Following, 'following'],
            ] as const, 'public')
        });
    }

    /**
     * Change your avatar to an uploaded media
     * 
     * @param mediaId Media id
     * @returns Success status
     */
    async setAvatar(mediaId: string) {
        return await this.fetch(ENDPOINTS.account_update_profile_image, { media_id: mediaId });
    }

    /**
     * Get user without id or username input
     * 
     * @returns Legacy user
     * @since v0.1.0
     */
    async verifyCredentials() {
        return await this.fetch(ENDPOINTS.account_verify_credentials);
    }



    /**
     * Get all Birdwatch notes on a tweet
     * 
     * @param id Tweet id
     * @returns Birdwatch notes
     * @since v0.4.0
     */
    async getBirdwatchNotesOnTweet(id: string) {
        return await this.fetch(ENDPOINTS.BirdwatchFetchNotes, { tweet_id: id });
    }

    /**
     * Get a Birdwatch contributor based on their alias
     * 
     * @param alias Birdwatch user alias
     * @returns Birdwatch user
     * @since v0.4.0
     */
    async getBirdwatchUser(alias: string) {
        return await this.fetch(ENDPOINTS.BirdwatchFetchBirdwatchProfile, { alias });
    }

    /**
     * Rate a Birdwatch note. The helpfulness level will be inferred automatically
     * 
     * @param noteId Birdwatch note id
     * @param args {@link BirdwatchRateNoteArgs}
     * @returns Success status
     * @since v0.4.0
     */
    async rateBirdwatchNote(noteId: string, args: BirdwatchRateNoteArgs) {
        return await this.fetch(ENDPOINTS.BirdwatchCreateRating, {
            data_v2: {
                helpfulness_level: args.helpful_tags?.length && args.unhelpful_tags?.length ? 'SomewhatHelpful' : args.unhelpful_tags?.length ? 'NotHelpful' : 'Helpful',
                helpful_tags: args.helpful_tags,
                not_helpful_tags: args.unhelpful_tags
            },
            note_id: noteId,
            rating_source: args.source === BirdwatchNoteSource.NeedsYourHelp ? 'BirdwatchHomeNeedsYourHelp' : 'BirdwatchForYouTimeline',
            source_platform: 'BirdwatchWeb',
            tweet_id: args.tweetId
        });
    }

    /**
     * Unrate a Birdwatch note
     * 
     * @param noteId Birdwatch note id
     * @returns Success status
     * @since v0.4.0
     */
    async unrateBirdwatchNote(noteId: string) {
        return await this.fetch(ENDPOINTS.BirdwatchDeleteRating, { note_id: noteId });
    }



    /**
     * Get bookmarked tweets
     * 
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getBookmarks(args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getBookmarksSlice(args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getBookmarksSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Bookmarks, args);
    }

    /**
     * Search bookmarked tweets
     * 
     * @param query Query
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.6.0
     */
    async* searchBookmarks(query: string | QueryBuilder, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.searchBookmarksSlice(query, args))) yield slice;
        return EMPTY_SLICE;
    }

    async searchBookmarksSlice(query: string | QueryBuilder, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BookmarkSearchTimeline, { rawQuery: typeof query === 'string' ? query : query.toString(), ...args });
    }

    /**
     * Remove all bookmarks
     * 
     * @returns Success status
     * @since v0.1.0
     */
    async clearBookmarks() {
        return await this.fetch(ENDPOINTS.BookmarksAllDelete);
    }



    /**
     * Get a community by its id
     * 
     * @param id Community id
     * @returns Community
     * @since v0.3.0
     */
    async getCommunity(id: string) {
        return await this.fetch(ENDPOINTS.CommunityByRestId, { communityId: id });
    }

    /**
     * Get tweets in a given community
     * 
     * @param id Community id
     * @param [args] {@link CommunityTweetsGetArgs}
     * @yields Slice of tweets
     * @since v0.3.0
     */
    async* getCommunityTweets(id: string, args?: CommunityTweetsGetArgs): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getCommunityTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getCommunityTweetsSlice(id: string, args?: CommunityTweetsGetArgs) {
        const rankingMode = args?.orderBy === CommunityTweetsOrder.Latest ? 'Recency' : 'Relevance';
        return await this.fetch(ENDPOINTS.CommunityTweetsTimeline, { communityId: id, rankingMode, cursor: args?.cursor });
    }

    /**
     * Get tweets in a given community that contain media
     * 
     * @param id Community id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.3.0
     */
    async* getCommunityMedia(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getCommunityMediaSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getCommunityMediaSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CommunityMediaTimeline, { communityId: id, ...args });
    }

    /**
     * Join a community
     * 
     * @param id Community id
     * @returns Success status
     * @since v0.3.0
     */
    async joinCommunity(id: string) {
        return await this.fetch(ENDPOINTS.JoinCommunity, { communityId: id });
    }

    /**
     * Leave a community
     * 
     * @param id Community id
     * @returns Success status
     * @since v0.3.0
     */
    async leaveCommunity(id: string) {
        return await this.fetch(ENDPOINTS.LeaveCommunity, { communityId: id });
    }



    /**
     * Get a Twitter list by its id or slug
     * 
     * @param id List id or slug
     * @param [args] {@link BySlug}
     * @returns List
     * @since v0.1.0
     */
    async getList(id: string, args?: BySlug) {
        if (args?.bySlug) {
            return await this.fetch(ENDPOINTS.ListBySlug, { listId: id });
        }

        return await this.fetch(ENDPOINTS.ListByRestId, { listId: id });
    }

    /**
     * Get tweets of a list, created by listed users
     * 
     * @param id List id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getListTweets(id: string, args?: CursorOnly) {
        for await (const slice of this.getSlice(args, args => this.getListTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getListTweetsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListLatestTweetsTimeline, { listId: id, ...args });
    }

    /**
     * Get list discovery page
     * 
     * @returns Slice of lists
     * @since v0.6.0
     */
    async getListDiscovery() {
        return await this.fetch(ENDPOINTS.ListsDiscovery);
    }

    /**
     * Get lists you're a member of
     * 
     * @todo This should be turned into a generator
     * @param [args] {@link CursorOnly}
     * @returns Slice of lists
     * @since v0.6.0
     */
    async listedOn(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMemberships, args);
    }

    async getOwnedLists(userId: string, otherUserId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListOwnerships, { userId, isListMemberTargetUserId: otherUserId, ...args });
    }

    /**
     * Get members of a list
     * 
     * @param id List id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getListMembers(id: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getListMembersSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getListMembersSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMembers, { listId: id, ...args });
    }

    /**
     * Get subscribers of a list
     * 
     * @param id List id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getListSubscribers(id: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getListSubscribersSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getListSubscribersSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListSubscribers, { listId: id, ...args });
    }

    /**
     * Create a new list
     * 
     * @param args {@link ListCreateArgs}
     * @returns List
     * @since v0.1.0
     */
    async createList(args: ListCreateArgs) {
        return await this.fetch(ENDPOINTS.CreateList, { name: args.name, description: args.description || '', isPrivate: !!args.private });
    }

    /**
     * Edit details of a list
     * 
     * @param id List id
     * @param args {@link ListCreateArgs|Required\<ListCreateArgs\>}
     * @returns Success status
     * @since v0.1.0
     */
    async editList(id: string, args: Required<ListCreateArgs>) {
        return await this.fetch(ENDPOINTS.UpdateList, { listId: id, name: args.name, description: args.description, isPrivate: args.private });
    }

    /**
     * Delete a list
     * 
     * @param id List id
     * @returns Success status
     * @since v0.1.0
     */
    async deleteList(id: string) {
        return await this.fetch(ENDPOINTS.DeleteList, { listId: id });
    }

    /**
     * Set the banner of a list to a media
     * 
     * @param listId List id
     * @param mediaId Media id
     * @returns Success status
     * @since v0.6.0
     */
    async setListBanner(listId: string, mediaId: string) {
        if (mediaId) {
            return await this.fetch(ENDPOINTS.EditListBanner, { listId, mediaId });
        }

        return await this.fetch(ENDPOINTS.DeleteListBanner, { listId });
    }

    /**
     * Adds a user to a list
     * @param listId List id
     * @param userId User id
     * @returns Success status
     * @since v0.1.0
     */
    async listUser(listId: string, userId: string) {
        return await this.fetch(ENDPOINTS.ListAddMember, { listId, userId });
    }

    /**
     * Remove a user from a list
     * 
     * @param listId List id
     * @param userId User id
     * @returns Success status
     * @since v0.1.0
     */
    async unlistUser(listId: string, userId: string) {
        return await this.fetch(ENDPOINTS.ListRemoveMember, { listId, userId });
    }

    /**
     * Subscribe to a list
     * 
     * @param id List id
     * @returns Success status
     * @since v0.1.0
     */
    async subscribeToList(id: string) {
        return await this.fetch(ENDPOINTS.ListSubscribe, { listId: id });
    }

    /**
     * Unsubscribe from a list
     * 
     * @param id List id
     * @returns Success status
     * @since v0.1.0
     */
    async unsubscribeFromList(id: string) {
        return await this.fetch(ENDPOINTS.ListUnsubscribe, { listId: id });
    }

    /**
     * Add a list to your pinned timelines
     * 
     * @param id List id
     * @returns Success status
     * @since v0.6.0
     */
    async pinList(id: string) {
        return await this.fetch(ENDPOINTS.PinTimeline, { pinnedTimelineItem: { id, pinned_timeline_type: 'List' } });
    }

    /**
     * Remove a list from your pinned timelines
     * 
     * @param id List id
     * @since v0.6.0
     * @returns Success status
     */
    async unpinList(id: string) {
        return await this.fetch(ENDPOINTS.UnpinTimeline, { pinnedTimelineItem: { id, pinned_timeline_type: 'List' } });
    }

    /**
     * Mute a list, preventing it from sending you notifications
     * 
     * @param id List id
     * @returns Success status
     * @since v0.6.0
     */
    async muteList(id: string) {
        return await this.fetch(ENDPOINTS.MuteList, { listId: id });
    }

    /**
     * Unmute a list
     * 
     * @param id List id
     * @returns Success status
     * @since v0.6.0
     */
    async unmuteList(id: string) {
        return await this.fetch(ENDPOINTS.UnmuteList, { listId: id });
    }



    /**
     * Get notifications
     * 
     * @param [args] {@link NotificationGetArgs}
     * @yields Slice of notifications
     * @since v0.1.0
     */
    async* getNotifications(args?: NotificationGetArgs): Timeline<Notification> {
        for await (const slice of this.getSlice(args, this.getNotificationsSlice)) yield slice;
        return EMPTY_SLICE;
    }

    private async getNotificationsSlice(args?: NotificationGetArgs) {
        const timelineType = !args?.filter || args.filter === 'None' ? 'All' : args.filter;
        return await this.fetch(ENDPOINTS.NotificationsTimeline, { timeline_type: timelineType, cursor: args?.cursor });
    }

    /**
     * Get recent tweets from users you allowed notifications from
     * 
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getNotifiedTweets(args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, this.getNotifiedTweetsSlice)) yield slice;
        return EMPTY_SLICE;
    }

    private async getNotifiedTweetsSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.device_follow, args);
    }

    /**
     * Mark notifications as read by setting the last seen cursor forward to the top cursor given by the notification timeline
     * 
     * @param cursor Top cursor
     * @returns Cursor
     * @since v0.6.0
     */
    async lastSeenCursor(cursor: string) {
        return await this.fetch(ENDPOINTS.last_seen_cursor, { cursor });
    }

    /**
     * Get amount of unread notifications
     * 
     * @returns Unread count
     * @since v0.1.0
     */
    async getUnreadCount() {
        return await this.fetch(ENDPOINTS.badge_count);
    }

    

    /**
     * Get tweets of a timeline
     * 
     * @param [args] {@link TimelineGetArgs}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    getTimeline(args?: TimelineGetArgs): Timeline<TweetKind>;
    /**
     * Get tweets of a generic timeline by its id
     * 
     * @param id Generic timeline id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    getTimeline(id: string, args?: CursorOnly): Timeline<TweetKind>;

    async* getTimeline(idOrArgs?: string | TimelineGetArgs, args?: CursorOnly): Timeline<TweetKind> {
        if (typeof idOrArgs === 'string') {
            for await (const slice of this.getSlice(args, args => this.getTimelineSlice(idOrArgs, args))) yield slice;
        } else {
            for await (const slice of this.getSlice(idOrArgs, args => this.getTimelineSlice(args))) yield slice;
        }

        return EMPTY_SLICE;
    }

    private async getTimelineSlice(args?: TimelineGetArgs): Promise<TwitterResponse<Slice<TweetKind>>>;
    private async getTimelineSlice(id: string, args?: CursorOnly): Promise<TwitterResponse<Slice<TweetKind>>>;

    private async getTimelineSlice(idOrArgs: string | TimelineGetArgs = {}, args?: CursorOnly) {
        if (typeof idOrArgs === 'string') {
            return await this.fetch(ENDPOINTS.GenericTimelineById, { timelineId: idOrArgs, cursor: args?.cursor });
        }

        const seenTweetIds = idOrArgs.seenTweetIds ?? [];
        const requestContext = idOrArgs.cursor ? undefined : 'launch';

        if (idOrArgs.orderBy === 'Latest') {
            return await this.fetch(ENDPOINTS.HomeLatestTimeline, { seenTweetIds, requestContext, cursor: idOrArgs.cursor });
        }

        return await this.fetch(ENDPOINTS.HomeTimeline, { seenTweetIds, requestContext, cursor: idOrArgs.cursor });
    }

    /**
     * Search tweets
     * 
     * @param query Query
     * @param [args] {@link SearchArgs}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    search(query: string | QueryBuilder, args?: SearchArgs & { kind?: 'Relevant' | 'Latest' | 'Media' }): Timeline<TweetKind>;
    /**
     * Search users
     * 
     * @param query Query
     * @param [args] {@link SearchArgs}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    search(query: string | QueryBuilder, args?: SearchArgs & { kind: 'Users' }): Timeline<UserKind>;
    /**
     * Search lists
     * 
     * @param query Query
     * @param [args] {@link SearchArgs}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    search(query: string | QueryBuilder, args?: SearchArgs & { kind: 'Lists' }): Timeline<ListKind>;

    async* search<T extends Type<string>>(query: string | QueryBuilder, args?: SearchArgs): Timeline<T> {
        for await (const slice of this.getSlice(args, args => this.searchSlice(query, args))) yield slice as TwitterResponse<Slice<T>>;
        return EMPTY_SLICE;
    }

    async searchSlice(query: string | QueryBuilder, args?: SearchArgs) {
        const product = args?.kind === 'Relevant'
            ? 'Top'
        : args?.kind === 'Users'
            ? 'People'
            : args?.kind || 'Top';

        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: typeof query === 'string' ? query : query.toString(), querySource: 'typed_query', product, cursor: args?.cursor });
    }

    /**
     * Get search auto-completion users and topics
     * 
     * @param query Query
     * @returns Search typeahead
     * @since v0.1.0
     */
    async typeahead(query: string) {
        return await this.fetch(ENDPOINTS.search_typeahead, { q: query });
    }



    /**
     * Creates a new tweet with the specified content. A note tweet will be created if required by text (max 280) or media (max 4) array length, and allowed in options
     * 
     * Additional thread tweets will be created with individual requests, as Twitter doesn't have an official way of handling this
     * 
     * Note: this endpoint is protected by Twitter and may be unsafe to fetch repeatedly. Read {@link https://github.com/exieneko/twitter-client#how-to-protect-your-account|the README} for more information
     * 
     * @param args {@link TweetCreateArgs}
     * @param [thread] Additional tweets
     * @returns Tweet
     * @since v0.1.0
     */
    async createTweet(args: TweetCreateArgs, thread?: ThreadTweetArgs[]): Promise<TwitterResponse<Tweet>>;

    /**
     * Creates a new tweet with the specified content
     * 
     * Note: this endpoint is protected by Twitter and may be unsafe to fetch repeatedly. Read {@link https://github.com/exieneko/twitter-client#how-to-protect-your-account|the README} for more information
     * 
     * @param text Tweet text
     * @returns Tweet
     * @since v0.1.0
     */
    async createTweet(text: string): Promise<TwitterResponse<Tweet>>;

    async createTweet(argsOrText: string | TweetCreateArgs, thread?: ThreadTweetArgs[]): Promise<TwitterResponse<Tweet>> {
        const args: TweetCreateArgs = typeof argsOrText === 'string' ? {} : argsOrText;
        const text = (typeof argsOrText === 'string' ? argsOrText : argsOrText.text) || '';

        if (text.length > TWEET_CHARACTER_LIMIT && this.#options.longTweetBehavior === 'Fail') {
            return {
                errors: [new TwitterError(TwitterErrorCode.InvalidTweetTextLength, { data: text.length })]
            };
        }

        const mode = match(args.replyPermission, [
            [ReplyPermission.Following, 'Community'],
            [ReplyPermission.Verified, 'Verified'],
            [ReplyPermission.Following, 'ByInvitation']
        ] as const);

        if (text.length > TWEET_CHARACTER_LIMIT && (this.#options.longTweetBehavior === 'NoteTweet' || this.#options.longTweetBehavior === 'NoteTweetUnchecked')) {
            return {
                errors: [new TwitterError(TwitterErrorCode.NotImplemented)]
            };
        }

        if (args.mediaIds?.length && args.mediaIds.length > 4) {
            return {
                errors: [new TwitterError(TwitterErrorCode.InvalidMediaCount, { data: args.mediaIds.length })]
            };
        }

        let cardUri: string | undefined = undefined;

        if (args.card?.kind === 'Poll') {
            if (args.card.choices.length < 2 || args.card.choices.length > 4) {
                return {
                    errors: [new TwitterError(TwitterErrorCode.InvalidPollChoicesCount, { data: args.card.choices.length })]
                };
            }

            const hasImage = args.card.choices.some(choice => !!choice.media_id);

            const { errors, data: uri } = await this.fetch(ENDPOINTS.cards_create, {
                card_data: JSON.stringify({
                    'twitter:api:api:endpoint': '1',
                    'twitter:card': hasImage ? `1906814671912599552:poll_choice_images` : `poll${args.card.choices.length}choice_text_only`,
                    'twitter:long:duration_minutes': Math.floor(args.card.duration / 60),
                    'twitter:string:choice1_label': args.card!.choices.at(0)!.text,
                    'twitter:image:choice1_image:src:id': hasImage ? `mis://${args.card!.choices.at(0)!.media_id}` : undefined,
                    'twitter:string:choice2_label': args.card!.choices.at(1)!.text,
                    'twitter:image:choice2_image:src:id': hasImage ? `mis://${args.card!.choices.at(1)!.media_id}` : undefined,
                    'twitter:string:choice3_label': args.card!.choices.at(2)?.text,
                    'twitter:image:choice3_image:src:id': hasImage ? `mis://${args.card!.choices.at(2)?.media_id}` : undefined,
                    'twitter:string:choice4_label': args.card!.choices.at(3)?.text,
                    'twitter:image:choice4_image:src:id': hasImage ? `mis://${args.card!.choices.at(3)?.media_id}` : undefined
                })
            });

            if (!uri) {
                return { errors };
            }

            cardUri = uri;
        }

        const { errors, data: tweet } = await this.fetch(ENDPOINTS.CreateTweet, {
            batch_compose: !!thread?.length && !args.replyTo ? 'BatchFirst' : undefined,
            card_uri: cardUri,
            conversation_control: mode ? { mode } : undefined,
            content_disclosure: args.content_disclosures?.is_ai_generated || args.content_disclosures?.is_sponsored ? {
                advertising_promotion: args.content_disclosures.is_sponsored ? {
                    is_paid_promotion: !!args.content_disclosures.is_sponsored
                } : undefined,
                ai_generated_disclosure: args.content_disclosures.is_ai_generated ? {
                    has_ai_generated_media: !!args.content_disclosures.is_ai_generated
                } : undefined
            } : undefined,
            media: {
                media_entities: args.mediaIds?.map(id => ({
                    media_id: id,
                    tagged_users: []
                })) || [],
                possibly_sensitive: !!args.sensitive
            },
            reply: !!args.replyTo ? {
                exclude_reply_user_ids: [],
                in_reply_to_tweet_id: args.replyTo
            } : undefined,
            semantic_annotation_ids: [],
            tweet_text: text
        });

        if (!tweet) {
            return { errors };
        }

        if (!thread?.length || !tweet?.id) {
            return { errors, data: tweet };
        }

        let lastTweetId = tweet.id;

        for (const t of thread) {
            const { data } = await this.fetch(ENDPOINTS.CreateTweet, {
                batch_compose: !args.replyTo ? 'BatchSubsequent' : undefined,
                media: {
                    media_entities: t.mediaIds?.map(id => ({
                        media_id: id,
                        tagged_users: []
                    })) || [],
                    possibly_sensitive: !!args.sensitive
                },
                reply: {
                    exclude_reply_user_ids: [],
                    in_reply_to_tweet_id: lastTweetId
                },
                semantic_annotation_ids: [],
                tweet_text: t.text || ''
            });

            if (!data) {
                return { errors, data: tweet };
            }

            lastTweetId = data.id;
        }

        return { errors, data: tweet };
    }

    /**
     * Delete an owned tweet
     * 
     * @param id Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async deleteTweet(id: string) {
        return await this.fetch(ENDPOINTS.DeleteTweet, { tweet_id: id });
    }

    /**
     * Schedule a tweet
     * 
     * @param args {@link ScheduledTweetCreateArgs}
     * @returns Scheduled tweet id
     * @since v1.0.0-rc.1
     */
    async createScheduledTweet(args: ScheduledTweetCreateArgs) {
        return await this.fetch(ENDPOINTS.CreateScheduledTweet, {
            execute_at: (typeof args.sendAt === 'number' ? args.sendAt : args.sendAt.getTime()) / 1000,
            post_tweet_request: {
                auto_populate_reply_metadata: false,
                exclude_reply_user_ids: [],
                status: args.text || '',
                media_ids: args.mediaIds || []
            }
        });
    }

    /**
     * Edit a scheduled tweet
     * 
     * @param id Scheduled tweet id
     * @param [args] {@link ScheduledTweetCreateArgs}
     * @returns Success status
     * @since v1.0.0-rc.1
     */
    async editScheduledTweet(id: string, args: ScheduledTweetCreateArgs) {
        return await this.fetch(ENDPOINTS.EditScheduledTweet, {
            execute_at: (typeof args.sendAt === 'number' ? args.sendAt : args.sendAt.getTime()) / 1000,
            post_tweet_request: {
                auto_populate_reply_metadata: false,
                exclude_reply_user_ids: [],
                media_ids: args.mediaIds || [],
                status: args.text || ''
            },
            scheduled_tweet_id: id
        });
    }

    async getScheduledTweets(args?: UnsentTweetsGetArgs) {
        return await this.fetch(ENDPOINTS.FetchScheduledTweets, { ascending: !!args?.ascending });
    }

    /**
     * Get a tweet and its replies as a timeline by its id
     * 
     * @param id Tweet id
     * @param [args] {@link TweetGetArgs}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getTweet(id: string, args?: TweetGetArgs): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getTweetSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getTweetSlice(id: string, args?: TweetGetArgs) {
        const rankingMode = match(args?.orderBy, [
            [TweetOrder.New, 'Recency'],
            [TweetOrder.Likes, 'Likes']
        ] as const, 'Relevance');

        return await this.fetch(ENDPOINTS.TweetDetail, { focalTweetId: id, rankingMode, cursor: args?.cursor });
    }

    /**
     * Get a tweet by its id. Unlike `getTweet`, this method doesn't return a `Timeline` async generator, only the root tweet
     * 
     * @param id Tweet id
     * @returns Tweet
     * @since v0.6.0
     */
    async getTweetResult(id: string) {
        return await this.fetch(ENDPOINTS.TweetResultByRestId, { tweetId: id });
    }

    /**
     * Get tweets by their ids
     * 
     * @param ids Tweet ids
     * @returns Array of tweets
     * @since v0.6.0
     */
    async getTweetResults(ids: string[]) {
        return await this.fetch(ENDPOINTS.TweetResultsByRestIds, { tweetIds: ids });
    }

    /**
     * Get hidden replies on a tweet
     * 
     * @param tweetId Tweet id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getHiddenReplies(tweetId: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getHiddenRepliesSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getHiddenRepliesSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ModeratedTimeline, { rootTweetId: tweetId, ...args });
    }

    /**
     * Get users that liked a tweet by the tweet's id. In ~June 2024, liked tweet were made private, so this method will return an empty array if you aren't the author of the tweet
     * 
     * @param tweetId Tweet id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getLikes(tweetId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getLikesSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getLikesSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Favoriters, { tweetId: tweetId, ...args });
    }

    /**
     * Get users that retweeted a tweet by the tweet's id
     * 
     * @param tweetId Tweet id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getRetweets(tweetId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getRetweetsSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getRetweetsSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Retweeters, { tweetId: tweetId, ...args });
    }

    /**
     * Get quote tweets to a tweet by the original tweet's id
     * 
     * @param tweetId Original tweet's id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getQuoteTweets(tweetId: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getQuoteTweetsSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getQuoteTweetsSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: `quoted_tweet_id:${tweetId}`, querySource: 'tdqt', product: 'Top', ...args }) as TwitterResponse<Slice<TweetKind>>;
    }

    /**
     * Bookmark a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async bookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateBookmark, { tweet_id: tweetId });
    }

    /**
     * Unbookmark a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async unbookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteBookmark, { tweet_id: tweetId });
    }

    /**
     * Like a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async like(tweetId: string) {
        return await this.fetch(ENDPOINTS.FavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Unlike a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async unlike(tweetId: string) {
        return await this.fetch(ENDPOINTS.UnfavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Retweet a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async retweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateRetweet, { tweet_id: tweetId });
    }

    /**
     * Unretweet a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async unretweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteRetweet, { source_tweet_id: tweetId });
    }

    /**
     * Hide a reply on a tweet you created. It will still be visible in hidden replies
     * 
     * @param id Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async hideTweet(id: string) {
        return await this.fetch(ENDPOINTS.ModerateTweet, { tweetId: id });
    }

    /**
     * Unhide a hidden reply
     * 
     * @param id Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async unhideTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnmoderateTweet, { tweetId: id });
    }

    /**
     * Set a tweet you created as your pinned tweet
     * 
     * @param id Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async pinTweet(id: string) {
        return await this.fetch(ENDPOINTS.PinTweet, { tweet_id: id });
    }

    /**
     * Remove your pinned tweet
     * 
     * @param id Your current pinned tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async unpinTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnpinTweet, { tweet_id: id });
    }

    /**
     * Vote on a poll
     * 
     * @param args {@link TweetVoteArgs}
     * @returns Success status
     * @since v0.1.0
     */
    async vote(args: TweetVoteArgs): Promise<TwitterResponse<boolean>> {
        if (args.choice < 1 || args.choice > 4) {
            return {
                errors: [new TwitterError(TwitterErrorCode.InvalidVoteIndex, { data: args.choice })]
            };
        }

        return await this.fetch(ENDPOINTS.capi_passthrough_1, {
            'twitter:long:original_tweet_id': args.tweetId,
            'twitter:string:card_uri': args.cardUri,
            'twitter:string:response_card_name': args.cardName,
            'twitter:string:selected_choice': args.choice
        });
    }

    /**
     * Change who can reply to an owned tweet
     * 
     * @param tweetId Tweet id
     * @param [permission] Reply permission. `undefined` will remove the permission, allowing everyone to reply
     * @returns Success status
     * @since v0.2.0
     */
    async changeReplyPermission(tweetId: string, permission?: ReplyPermission) {
        if (!permission || permission === ReplyPermission.Everyone) {
            return await this.fetch(ENDPOINTS.ConversationControlDelete, { tweet_id: tweetId });
        }

        const mode = match(permission, [
            [ReplyPermission.Following, 'Community'],
            [ReplyPermission.Verified, 'Verified']
        ] as const, 'ByInvitation');

        return await this.fetch(ENDPOINTS.ConversationControlChange, { tweet_id: tweetId, mode });
    }

    /**
     * Remove yourself from a conversation that includes you, changing user mention links that lead to your profile to plain text
     * 
     * @param id Root tweet id
     * @returns Success status
     * @since v0.6.0
     */
    async unmention(id: string) {
        return await this.fetch(ENDPOINTS.UnmentionUserFromConversation, { tweet_id: id });
    }

    /**
     * Mute a tweet, preventing you from getting notifications relating to it
     * 
     * @param id Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async muteTweet(id: string) {
        return await this.fetch(ENDPOINTS.mutes_conversations_create, { tweet_id: id });
    }

    /**
     * Unmute a tweet
     * 
     * @param id Tweet id
     * @returns Success status
     * @since v0.1.0
     */
    async unmuteTweet(id: string) {
        return await this.fetch(ENDPOINTS.mutes_conversations_destroy, { tweet_id: id });
    }



    /**
     * Get a user by their id, or username if specified
     * 
     * @param id User id or username
     * @param [args] {@link ByUsername}
     * @returns User
     * @since v0.1.0
     */
    async getUser(id: string, args?: ByUsername) {
        const { errors, data: user } = await (args?.byUsername
            ? this.fetch(ENDPOINTS.UserByScreenName, { screen_name: id })
            : this.fetch(ENDPOINTS.UserByRestId, { userId: id })
        );
        
        if (errors.length > 0) {
            return { errors, data: user };
        }

        if (user?.__typename === 'User' && this.self?.id === user.id) {
            this.self = user;
        }

        return { errors, data: user };
    }

    /**
     * Get multiple users by their ids, or usernames if specified
     * 
     * @param ids User ids or usernames
     * @param [args] {@link ByUsername}
     * @returns Users
     * @since v0.1.0
     */
    async getUsers(ids: string[], args?: ByUsername) {
        if (args?.byUsername) {
            return await this.fetch(ENDPOINTS.UsersByScreenNames, { screen_names: ids });
        }

        return await this.fetch(ENDPOINTS.UsersByRestIds, { userIds: ids });
    }

    /**
     * Get tweets from a user chronologically
     * 
     * @param id User id
     * @param [args] {@link UserTweetsGetArgs}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getUserTweets(id: string, args?: UserTweetsGetArgs): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getUserTweetsSlice(id: string, args?: UserTweetsGetArgs) {
        if (args?.replies) {
            return await this.fetch(ENDPOINTS.UserTweetsAndReplies, { userId: id, cursor: args.cursor });
        }

        return await this.fetch(ENDPOINTS.UserTweets, { userId: id, cursor: args?.cursor });
    }

    /**
     * Get media tweets from a user chronologically
     * 
     * @param id User id
     * @param [args] Cursor only
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getUserMedia(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserMediaSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getUserMediaSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserMedia, { userId: id, ...args });
    }

    /**
     * Get liked tweets of a user chronologically (ordered by the time when each tweet was liked instead of when the tweets were created)
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getUserLikes(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserLikesSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getUserLikesSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Likes, { userId: id, ...args });
    }

    /**
     * Get highlighted tweets from a user. Highlighting tweets is a feature only available to verified users
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since v0.1.0
     */
    async* getUserHighlightedTweets(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserHighlightedTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getUserHighlightedTweetsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserHighlightsTweets, { userId: id, ...args });
    }

    /**
     * Get followed users of a user
     * 
     * @param userId User id 
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getFollowing(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getFollowingSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getFollowingSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Following, { userId: userId, ...args });
    }

    /**
     * Get followers of a user
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getFollowers(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getFollowersSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getFollowersSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Followers, { userId: userId, ...args });
    }

    /**
     * Get followers of a user that you also follow
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getFollowersYouKnow(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getFollowersYouKnowSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getFollowersYouKnowSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.FollowersYouKnow, { userId: userId, ...args });
    }

    /**
     * Get verified followers of a user
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getVerifiedFollowers(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getVerifiedFollowersSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getVerifiedFollowersSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BlueVerifiedFollowers, { userId: userId, ...args });
    }

    /**
     * Get super followed users of a user. Note that super follows can be set to private
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getSuperFollowing(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getSuperFollowingSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getSuperFollowingSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserCreatorSubscriptions, { userId: userId, ...args });
    }

    /**
     * Get affiliates of a business account by the business account's id
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since v0.1.0
     */
    async* getAffiliates(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getAffiliatesSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getAffiliatesSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserBusinessProfileTeamTimeline, { userId: userId, teamName: 'NotAssigned', ...args });
    }

    /**
     * Get lists created by a user
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of lists
     * @since v0.1.0
     */
    async* getUserLists(id: string, args?: CursorOnly): Timeline<ListKind> {
        for await (const slice of this.getSlice(args, args => this.getUserListsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    private async getUserListsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CombinedLists, { userId: id, ...args });
    }

    /**
     * Follow a user
     * 
     * @param id User id
     * @param [args] {@link ByUsername}
     * @returns Success status
     * @since v0.1.0
     */
    async followUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unfollow a user
     * 
     * @param id User id
     * @param [args] {@link ByUsername}
     * @returns Success status
     * @since v0.1.0
     */
    async unfollowUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Allow retweets from a followed user to show up on your timeline
     * 
     * @param userId User id
     * @returns Success status
     * @since v0.2.0
     */
    async enableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: true });
    }

    /**
     * Forbid retweets from a followed user to show up on your timeline
     * 
     * @param userId User id
     * @returns Success status
     * @since v0.2.0
     */
    async disableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: false });
    }

    /**
     * Enable receiveing tweet notifications from a user
     * 
     * @param userId User id
     * @returns Success status
     * @since v0.2.0
     */
    async enableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: true });
    }

    /**
     * Disable receiveing tweet notifications from a user
     * 
     * @param userId User id
     * @returns Success status
     * @since v0.2.0
     */
    async disableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: false });
    }

    /**
     * Get incoming follow requests
     * 
     * @param [args] {@link CursorOnly}
     * @returns User ids
     * @since v0.1.0
     */
    async getFollowRequests(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.friendships_incoming, { cursor: Number(args?.cursor || '-1') });
    }

    /**
     * Cancel an outgoing follow request to a user
     * 
     * @param userId User id
     * @param [args] {@link ByUsername}
     * @returns Success status
     * @since v0.1.0
     */
    async cancelFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_cancel, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Accept an incoming follow request from a user
     * 
     * @param userId User id
     * @param [args] {@link ByUsername}
     * @returns Success status
     * @since v0.1.0
     */
    async acceptFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_accept, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Decline an incoming follow request from a user
     * 
     * @param userId User id
     * @param [args] {@link byUsername}
     * @returns Success status
     * @since v0.1.0
     */
    async declineFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_deny, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Block a user
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @returns Success status
     * @since v0.1.0
     */
    async blockUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.blocks_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unblock a user
     * 
     * **Note**: this method is under additional protections and may return a 404 error for some users
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @returns Success status
     * @since v0.1.0
     */
    async unblockUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.blocks_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Remove a user from following you
     * 
     * @param id User id
     * @returns Success status
     * @since v1.0.0-rc.1
     */
    async softblockUser(id: string) {
        return await this.fetch(ENDPOINTS.RemoveFollower, { target_user_id: id });
    }

    /**
     * Mute a user
     * 
     * @param id User id
     * @param [args] {@link ByUsername}
     * @returns Success status
     * @since v0.1.0
     */
    async muteUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.mutes_users_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unmute a user
     * 
     * @param id User id
     * @param [args] {@link byUsername}
     * @returns Success status
     * @since v0.1.0
     */
    async unmuteUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.mutes_users_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Upload an image or video file to Twitter by sending the file's data in several request, in small chunks
     * 
     * @param media The file's data as an `ArrayBuffer`
     * @param args {@link MediaUploadArgs}
     * @param callback Callback function executed after each chunk is uploaded
     * @returns Media
     * @since v0.6.0
     */
    async upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void): Promise<TwitterResponse<Media>> {
        const append = async (id: string, data: ArrayBuffer, index: number, contentType: string) => {
            const body = new URLSearchParams({
                command: 'APPEND',
                media_id: id,
                segment_index: index.toString()
            }).toString();

            let formData = new FormData();
            formData.append('media', new Blob([data], { type: contentType }));

            return await fetch(`https://upload.${this.#options.domain}/1.1/media/upload.json?${body}`, {
                method: 'POST',
                headers: this.getHeaders(PUBLIC_TOKEN, 'Media'),
                body: formData,
                dispatcher: this.getProxyAgent()
            });
        };

        try {
            const { errors: errorsInit, data: init } = await this.fetch(ENDPOINTS.media_upload_INIT, {
                total_bytes: media.byteLength.toString(),
                media_type: args.contentType,
                media_category: args.contentType.startsWith('video/') ? 'tweet_video' : args.contentType.endsWith('gif') ? 'tweet_gif' : 'tweet_image'
            });

            if (errorsInit.length) {
                return { errors: errorsInit };
            }

            const chunkSize = args.segmentSizeOverride || 1_084_576;
            const chunksNeeded = Math.ceil(media.byteLength / chunkSize);

            const chunks = [...Array(chunksNeeded).keys()].map(index => media.slice(index * chunkSize, (index + 1) * chunkSize));

            for (const [index, chunk] of chunks.entries()) {
                const response = await append(init!.media_id_string, chunk, index, args.contentType);

                if (!response.ok) {
                    const { errors }: any = await response.json();

                    if (!!errors) {
                        return { errors };
                    }

                    throw response.statusText;
                }

                callback?.(chunk, index, chunksNeeded);
            }

            const final = await this.fetch(ENDPOINTS.media_upload_FINALIZE, { media_id: init!.media_id_string });

            if (!!final.data && !!args.altText) {
                this.addAltText(init!.media_id_string, args.altText);
            }

            return final;
        } catch (error) {
            return {
                errors: [new TwitterError(0, { cause: error })]
            };
        }
    }

    /**
     * Check the current status of an uploaded media file
     * 
     * @param id Media id
     * @returns Media
     * @since v0.6.0
     */
    async mediaStatus(id: string) {
        return await this.fetch(ENDPOINTS.media_upload_STATUS, { media_id: id });
    }

    /**
     * Add ALT text to an uploaded media
     * 
     * @param id Media id
     * @param text ALT text
     * @returns Success status
     * @since v0.6.0
     */
    async addAltText(id: string, text: string) {
        return await this.fetch(ENDPOINTS.media_metadata_create, {
            allow_download_status: { allow_download: 'true' },
            alt_text: { text },
            media_id: id
        });
    }
}
