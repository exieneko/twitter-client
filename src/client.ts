import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { hrtime } from 'node:process';
import { FormData, ProxyAgent, Response } from 'undici';
import { ClientTransaction } from 'x-client-transaction-id';

import { EMPTY_SLICE, ENDPOINTS, MAX_TIMELINE_ITERATIONS, TWEET_MEDIA_RANGE, TWEET_POLL_RANGE, TWEET_TEXT_RANGE, UPLOAD_SEGMENT_SIZE } from './consts.js';
import { TwitterFormatter } from './fmt/index.js';
import { BirdwatchNoteSource, BirthDateVisibility, CommunityTweetsOrder, ReplyPermission, Slice, TweetKind, TweetOrder, type BirdwatchRateNoteArgs, type BlockedUsersGetArgs, type BySlug, type ByUsername, type CommunityTweetsGetArgs, type CursorOnly, type ListCreateArgs, type ListKind, type MediaData, type MediaUploadArgs, type Notification, type NotificationGetArgs, type TwitterOptions, type ScheduledTweetCreateArgs, type SearchTweetArgs, type ThreadTweetArgs, type Timeline, type TimelineGetArgs, type TwitterTokens, type Tweet, type TweetCreateArgs, type TweetGetArgs, type TweetVoteArgs, type TwitterResponse, type UnsentTweetsGetArgs, type UpdateProfileArgs, type User, type UserKind, type UserTweetsGetArgs, SearchOrder, SearchArgs, ValidationError, ApiError, RequestError, TwitterError, FormatterError, ClientError, DivineInterventionError } from './types/index.js';
import type { Endpoint, EndpointParams, Type } from './types/internal/index.js';
import { log, match } from './utils/index.js';
import { Query } from './utils/query.js';
import type { QueryBuilder } from './utils/querybuilder.js';
import { fetchXDocument, request } from './utils/request.js';

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
 * @since 1.0.0-rc.0
 */
export async function slice<T extends Type>(timeline: Timeline<T>): Promise<TwitterResponse<Slice<T>>> {
    const { value } = await timeline.next();
    await timeline.return(EMPTY_SLICE);
    return value;
}



/**
 * Asyncronous client used to make requests to the Twitter browser API while logged in as a Twitter user
 * 
 * @class
 * @since 0.1.0
 */
export class TwitterClient {
    #proxyAgent?: ProxyAgent;
    #transaction: ClientTransaction;
    #cookies: Record<string, string>;
    options: TwitterOptions;
    /**
     * The current user
     * 
     * @since 1.0.0-rc.0
     */
    self?: User;

    constructor(transaction: ClientTransaction, tokens: TwitterTokens, options: TwitterOptions, proxyAgent?: ProxyAgent) {
        const lang = options.language.toLowerCase().startsWith('en-') ? 'en' : options.language;

        this.#proxyAgent = proxyAgent;
        this.#transaction = transaction;
        this.#cookies = {
            auth_token: tokens.authToken,
            ct0: tokens.csrf,
            d_prefs: btoa('2:1,consent_version:2,text_version:1000'),
            lang
        };
        this.options = structuredClone(options);
        this.options.language = lang;
    }

    /**
     * Async constructor for `TwitterClient`
     * 
     * @constructor
     * @param tokens Your Twitter account's login tokens
     * @param [options] Additional options
     * @returns Promise resolving to `TwitterClient`
     * @throws {ClientError} if `ProxyAgent` or `ClientTransaction` can't be created
     * @since 1.0.0-rc.0
     */
    static async new(tokens: TwitterTokens, options?: Partial<TwitterOptions>): Promise<TwitterClient> {
        const opts: TwitterOptions = {
            domain: 'twitter.com',
            files: {},
            includeResponse: false,
            language: 'en',
            logs: 'Errors',
            longTweetBehavior: 'Force',
            proxyUrl: undefined,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            ...options
        };

        log.info(opts, 'Initializing TwitterClient with options:', options);

        let proxyAgent: ProxyAgent | undefined = undefined;
        if (options?.proxyUrl) {
            try {
                proxyAgent = new ProxyAgent(options.proxyUrl);
            } catch (error) {
                log.err(opts, 'Failed to initialize ProxyAgent', error);

                throw new ClientError(`Failed to initialize ProxyAgent with URL "${options.proxyUrl}"`, { cause: error });
            }
        }

        let client: TwitterClient;
        try {
            const document = await fetchXDocument(opts, proxyAgent);
            const transaction = await ClientTransaction.create(document);
            client = new this(transaction, tokens, opts, proxyAgent);
        } catch (error) {
            log.err(opts, 'Failed to initialize ClientTransaction', error);

            throw new ClientError('Failed to initialize ClientTransaction', {
                cause: error instanceof TypeError ? new ClientError('Failed to get Twitter HTML document', { cause: error }) : error
            });
        }

        if (client.options.language !== 'en') {
            log.warn(client, 'Setting language option to values other than "en" may have unexpected effects');
        }

        return client;
    }

    /**
     * Initialize `TwitterClient` from a cookies object
     * 
     * @param json Object containing cookies that should be loaded
     * @param [options] Additional options
     * @returns Promise resolving to `TwitterClient` or `undefined` if `json` doesn't contain the required cookies\
     * @throws {ValidationError} if `json` is not an object, or either `auth_token` or `ct0` is missing
     * @throws {ClientError} if `TwitterClient.new` throws
     * @since 1.0.0-rc.0
     */
    static async fromCookies(json: Record<string, string>, options?: Partial<TwitterOptions>): Promise<TwitterClient> {
        if (!json || typeof json !== 'object') {
            throw new ValidationError('Cookies json is not a valid object', {
                field: '*',
                value: json,
                expected: 'object'
            });
        }

        if (typeof json.auth_token !== 'string') {
            throw new ValidationError('Auth token is not a valid string', {
                field: 'auth_token',
                value: json.auth_token,
                expected: 'string'
            });
        } else if (typeof json.ct0 !== 'string') {
            throw new ValidationError('CSRF token is not a valid string', {
                field: 'ct0',
                value: json.ct0,
                expected: 'string'
            });
        }

        const client = await this.new({
            authToken: json.auth_token,
            csrf: json.ct0
        }, options);

        client.addTokens(Object.entries(json).map(v => v.join('=')));
        return client;
    }

    /**
     * Initialize `TwitterClient` from a JSON file
     * 
     * @param filePath Path to the file containing your cookies
     * @param [options] Additional options
     * @returns Promise resolving to `TwitterClient`
     * @throws {ClientError} if `TwitterClient.new` throws or if `filePath` can't be opened and parsed as JSON
     * @throws {ValidationError} if `TwitterClient.fromCookies` throws
     * @since 1.0.0-rc.0
     */
    static async fromCookiesFile(filePath: string, options?: Partial<TwitterOptions>): Promise<TwitterClient> {
        try {
            const content = readFileSync(filePath, 'utf8');
            const json = JSON.parse(content);

            return await this.fromCookies(json, options);
        } catch (error) {
            if (error instanceof TwitterError) {
                throw error;
            }

            throw new ClientError(`Error was thrown while reading or parsing "${filePath}"`, { cause: error });
        }
    }



    private async getTransactionId(endpoint: Endpoint) {
        const path = endpoint.url.replace(/.*twitter\.com\//, '/');
        const transactionId = await this.#transaction.generateTransactionId(endpoint.method, path);

        return transactionId;
    }

    protected addTokens(cookies: string[]) {
        for (const cookie of cookies) {
            const [key, ...value] = cookie.split('=');

            if (key === 'auth_token' || key === 'ct0') {
                continue;
            }

            this.#cookies[key] = value.join('=').split(';', 1)[0];
        }
    }

    private dump<T>(data: TwitterResponse<T>) {
        if (!this.options.files.data) {
            return;
        }

        let obj: TwitterResponse<T> = { data: structuredClone(data.data), errors: structuredClone(data.errors) };

        let json: any[] = [];

        if (existsSync(this.options.files.data)) {
            const content = readFileSync(this.options.files.data, 'utf8');
            try {
                json = JSON.parse(content);
            } catch {
                json = [];
            }
        }

        if (!Array.isArray(json)) {
            json = [];
        }

        json.push(obj);
        writeFileSync(this.options.files.data, JSON.stringify(json), 'utf8');
    }

    private dumpCookies() {
        if (!this.options.files.cookies) {
            return;
        }

        writeFileSync(this.options.files.cookies, JSON.stringify(this.#cookies), 'utf8');
    }

    /**
     * Main method responsible for interacting with the Twitter API. Calling this function with a valid `Endpoint` as a target will send a request to that endpoint and expect data back
     * 
     * If set, `params`, will be appended to the body of the request, the type of which is inferred from the pathname and method of the endpoint. This object is sent to the API as is, so the keys must have the name Twitter expects
     * 
     * @example
     * import { Endpoint } from '@exieneko/twitter-client/types/internal';
     * 
     * const { errors, data: user } = await this.fetch(
     *     new Endpoint<ReturnType, { screen_name: string }>({
     *         url: 'https://twitter.com/i/api/graphql/-oaLodhGbbnzJBACb1kk2Q/UserByScreenName',
     *         method: 'get',
     *         features: {}
     *     }, (fmt, value) => Promise.resolve(...))
     * );
     * 
     * @param endpoint Target endpoint
     * @param params Dynamic parameters to send to the endpoint
     * @returns Expected awaited return type of the target endpoint's `format` method
     * @see {@link Endpoint}
     */
    async fetch<EP extends Endpoint, T = Awaited<ReturnType<EP['format']>>>(endpoint: EP, params?: EndpointParams<EP>): Promise<TwitterResponse<T>> {
        type U = Parameters<EP['format']>[1];

        let json: U, r: Response;
        try {
            [json, r] = await request<EP, U>({
                endpoint,
                params,
                cookies: this.#cookies,
                options: this.options,
                proxyAgent: this.#proxyAgent,
                transactionId: await this.getTransactionId(endpoint)
            });
        } catch (error) {
            return {
                errors: [error instanceof TwitterError ? error : new DivineInterventionError('Request function threw an unknown error', { cause: error })]
            };
        }

        const response = this.options.includeResponse ? r : undefined;
        let errors: TwitterError[] = [];

        if (!json || Object.entries(json).length === 0) {
            return {
                errors: [new DivineInterventionError('Received data is empty')],
                response
            };
        }

        if (typeof json === 'object' && 'errors' in json && Array.isArray(json.errors)) {
            errors = json
                .errors
                .filter(error => typeof error === 'object' && 'message' in error)
                .map(error => new ApiError(error.message, { ...error }));
        }

        if (response) {
            this.addTokens(response.headers.getSetCookie());

            try {
                this.dumpCookies();
            } catch (error) {
                errors.push(new ClientError(`Failed to dump cookies to "${this.options.files.cookies}"`, { cause: error }));
            }
        }

        const fmt = new TwitterFormatter(this, params);
        const data = await fmt.format<T>(endpoint.format, json);

        let result: TwitterResponse<T> = {
            data,
            errors: [...fmt.errors, ...errors],
            response
        };

        try {
            this.dump(result);
        } catch (error) {
            result.errors.push(new ClientError(`Failed to dump JSON data to "${this.options.files.data}"`, { cause: error }));
        }

        return result;
    }

    private async* getSlice<T extends Type, U extends CursorOnly>(args: U | undefined, callback: (args: U) => Promise<TwitterResponse<Slice<T>>>): Timeline<T> {
        const a = (args ?? {}) as U;

        let iterations = 0;
        let cursors: string[] = [];

        while (cursors.length < 2 ? iterations < MAX_TIMELINE_ITERATIONS : cursors.at(-1) !== cursors.at(-2)) {
            const currentArgs: U = { ...a, cursor: cursors.at(-1) ?? args?.cursor };
            const next = await callback(currentArgs);

            iterations++;

            if (next.data?.entries) {
                const c = Slice.cursors(next.data);
                if (c.next) {
                    cursors.push(c.next);
                }
            }

            yield next;
        }

        return EMPTY_SLICE;
    }



    /**
     * Sets the {@link TwitterClient.self} property and returns its value
     * 
     * @returns User
     * @since 1.0.0-rc.0
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

        this.self = user;
        this.#cookies['twid'] = `u%3D${user.id}`;
        this.dumpCookies();

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
     * @since 0.1.0
     */
    async* getBlockedUsers(args?: BlockedUsersGetArgs): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getBlockedUsersSlice(args));
        return EMPTY_SLICE;
    }

    protected async getBlockedUsersSlice(args?: BlockedUsersGetArgs) {
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
     * @since 0.1.0
     */
    async* getMutedUsers(args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getMutedUsersSlice(args));
        return EMPTY_SLICE;
    }

    protected async getMutedUsersSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.MutedAccounts, args);
    }

    /**
     * Get your account settings
     * 
     * @returns Settings
     * @since 0.1.0
     */
    async getSettings() {
        return await this.fetch(ENDPOINTS.account_settings);
    }

    /**
     * Update data on your profile
     * 
     * @param args {@link UpdateProfileArgs}
     * @returns Success status
     * @since 0.1.0
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
     * @since 0.1.0
     */
    async verifyCredentials() {
        return await this.fetch(ENDPOINTS.account_verify_credentials);
    }



    /**
     * Get all Birdwatch notes on a tweet
     * 
     * @param id Tweet id
     * @returns Birdwatch notes
     * @since 0.4.0
     */
    async getBirdwatchNotesOnTweet(id: string) {
        return await this.fetch(ENDPOINTS.BirdwatchFetchNotes, { tweet_id: id });
    }

    /**
     * Get a Birdwatch contributor based on their alias
     * 
     * @param alias Birdwatch user alias
     * @returns Birdwatch user
     * @since 0.4.0
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
     * @since 0.4.0
     */
    async rateBirdwatchNote(noteId: string, args: BirdwatchRateNoteArgs) {
        return await this.fetch(ENDPOINTS.BirdwatchCreateRating, {
            data_v2: {
                helpfulness_level: args.helpfulTags?.length && args.unhelpfulTags?.length ? 'SomewhatHelpful' : args.unhelpfulTags?.length ? 'NotHelpful' : 'Helpful',
                helpful_tags: args.helpfulTags,
                not_helpful_tags: args.unhelpfulTags
            },
            note_id: noteId,
            rating_source: args.source === BirdwatchNoteSource.NeedsYourHelp ? 'BirdwatchHomeNeedsYourHelp' : 'BirdwatchForYouTimeline',
            tweet_id: args.tweetId
        });
    }

    /**
     * Unrate a Birdwatch note
     * 
     * @param noteId Birdwatch note id
     * @returns Success status
     * @since 0.4.0
     */
    async unrateBirdwatchNote(noteId: string) {
        return await this.fetch(ENDPOINTS.BirdwatchDeleteRating, { note_id: noteId });
    }



    /**
     * Get bookmarked tweets
     * 
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* getBookmarks(args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getBookmarksSlice(args));
        return EMPTY_SLICE;
    }

    protected async getBookmarksSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Bookmarks, args);
    }

    /**
     * Search bookmarked tweets
     * 
     * @param query Query
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.6.0
     */
    async* searchBookmarks(query: string | Query | QueryBuilder, args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.searchBookmarksSlice(query, args));
        return EMPTY_SLICE;
    }

    protected async searchBookmarksSlice(query: string | Query | QueryBuilder, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BookmarkSearchTimeline, { rawQuery: Query.parse(query), ...args });
    }

    /**
     * Remove all bookmarks
     * 
     * @returns Success status
     * @since 0.1.0
     */
    async clearBookmarks() {
        return await this.fetch(ENDPOINTS.BookmarksAllDelete);
    }



    /**
     * Get a community by its id
     * 
     * @param id Community id
     * @returns Community
     * @since 0.3.0
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
     * @since 0.3.0
     */
    async* getCommunityTweets(id: string, args?: CommunityTweetsGetArgs): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getCommunityTweetsSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getCommunityTweetsSlice(id: string, args?: CommunityTweetsGetArgs) {
        const rankingMode = args?.orderBy === CommunityTweetsOrder.Latest ? 'Recency' : 'Relevance';
        return await this.fetch(ENDPOINTS.CommunityTweetsTimeline, { communityId: id, rankingMode, cursor: args?.cursor });
    }

    /**
     * Get tweets in a given community that contain media
     * 
     * @param id Community id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.3.0
     */
    async* getCommunityMedia(id: string, args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getCommunityMediaSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getCommunityMediaSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CommunityMediaTimeline, { communityId: id, ...args });
    }

    /**
     * Join a community
     * 
     * @param id Community id
     * @returns Success status
     * @since 0.3.0
     */
    async joinCommunity(id: string) {
        return await this.fetch(ENDPOINTS.JoinCommunity, { communityId: id });
    }

    /**
     * Leave a community
     * 
     * @param id Community id
     * @returns Success status
     * @since 0.3.0
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
     * @since 0.1.0
     */
    async getList(id: string, args?: BySlug) {
        const listId = id;

        if (args?.bySlug) {
            return await this.fetch(ENDPOINTS.ListBySlug, { listId });
        }

        return await this.fetch(ENDPOINTS.ListByRestId, { listId });
    }

    /**
     * Get tweets of a list, created by listed users
     * 
     * @param id List id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* getListTweets(id: string, args?: CursorOnly) {
        yield* this.getSlice(args, args => this.getListTweetsSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getListTweetsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListLatestTweetsTimeline, { listId: id, ...args });
    }

    /**
     * Get list discovery page
     * 
     * @returns Slice of lists
     * @since 0.6.0
     */
    async getListDiscovery() {
        return await this.fetch(ENDPOINTS.ListsDiscovery);
    }

    /**
     * Get lists you're a member of
     * 
     * @param [args] {@link CursorOnly}
     * @yields Slice of lists
     * @since 0.6.0
     */
    async* listedOn(args?: CursorOnly): Timeline<ListKind> {
        yield* this.getSlice(args, args => this.listedOnSlice(args));
        return EMPTY_SLICE;
    }

    protected async listedOnSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMemberships, args);
    }

    async* getOwnedLists(userId: string, otherUserId: string, args?: CursorOnly): Timeline<ListKind> {
        yield* this.getSlice(args, args => this.getOwnedListsSlice(userId, otherUserId, args));
        return EMPTY_SLICE;
    }

    protected async getOwnedListsSlice(userId: string, otherUserId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListOwnerships, { userId, isListMemberTargetUserId: otherUserId, ...args });
    }

    /**
     * Get members of a list
     * 
     * @param id List id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getListMembers(id: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getListMembersSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getListMembersSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMembers, { listId: id, ...args });
    }

    /**
     * Get subscribers of a list
     * 
     * @param id List id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getListSubscribers(id: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getListSubscribersSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getListSubscribersSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListSubscribers, { listId: id, ...args });
    }

    /**
     * Create a new list
     * 
     * @param args {@link ListCreateArgs}
     * @returns List
     * @since 0.1.0
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
     * @since 0.1.0
     */
    async editList(id: string, args: Required<ListCreateArgs>) {
        return await this.fetch(ENDPOINTS.UpdateList, { listId: id, name: args.name, description: args.description, isPrivate: args.private });
    }

    /**
     * Delete a list
     * 
     * @param id List id
     * @returns Success status
     * @since 0.1.0
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
     * @since 0.6.0
     */
    async setListBanner(listId: string, mediaId?: string) {
        if (!mediaId) {
            return await this.fetch(ENDPOINTS.DeleteListBanner, { listId });
        }

        return await this.fetch(ENDPOINTS.EditListBanner, { listId, mediaId });
    }

    /**
     * Adds a user to a list
     * @param listId List id
     * @param userId User id
     * @returns Success status
     * @since 0.1.0
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
     * @since 0.1.0
     */
    async unlistUser(listId: string, userId: string) {
        return await this.fetch(ENDPOINTS.ListRemoveMember, { listId, userId });
    }

    /**
     * Subscribe to a list
     * 
     * @param id List id
     * @returns Success status
     * @since 0.1.0
     */
    async subscribeToList(id: string) {
        return await this.fetch(ENDPOINTS.ListSubscribe, { listId: id });
    }

    /**
     * Unsubscribe from a list
     * 
     * @param id List id
     * @returns Success status
     * @since 0.1.0
     */
    async unsubscribeFromList(id: string) {
        return await this.fetch(ENDPOINTS.ListUnsubscribe, { listId: id });
    }

    /**
     * Add a list to your pinned timelines
     * 
     * @param id List id
     * @returns Success status
     * @since 0.6.0
     */
    async pinList(id: string) {
        return await this.fetch(ENDPOINTS.PinTimeline, { pinnedTimelineItem: { id, pinned_timeline_type: 'List' } });
    }

    /**
     * Remove a list from your pinned timelines
     * 
     * @param id List id
     * @since 0.6.0
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
     * @since 0.6.0
     */
    async muteList(id: string) {
        return await this.fetch(ENDPOINTS.MuteList, { listId: id });
    }

    /**
     * Unmute a list
     * 
     * @param id List id
     * @returns Success status
     * @since 0.6.0
     */
    async unmuteList(id: string) {
        return await this.fetch(ENDPOINTS.UnmuteList, { listId: id });
    }



    /**
     * Get notifications
     * 
     * @param [args] {@link NotificationGetArgs}
     * @yields Slice of notifications
     * @since 0.1.0
     */
    async* getNotifications(args?: NotificationGetArgs): Timeline<Notification> {
        yield* this.getSlice(args, args => this.getNotificationsSlice(args));
        return EMPTY_SLICE;
    }

    protected async getNotificationsSlice(args?: NotificationGetArgs) {
        const timelineType = !args?.filter || args.filter === 'None' ? 'All' : args.filter;
        return await this.fetch(ENDPOINTS.NotificationsTimeline, { timeline_type: timelineType, cursor: args?.cursor });
    }

    /**
     * Get recent tweets from users you allowed notifications from
     * 
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* getNotifiedTweets(args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getNotifiedTweetsSlice(args));
        return EMPTY_SLICE;
    }

    protected async getNotifiedTweetsSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.device_follow, args);
    }

    /**
     * Mark notifications as read by setting the last seen cursor forward to the top cursor given by the notification timeline
     * 
     * @param cursor Top cursor
     * @returns Cursor
     * @since 0.6.0
     */
    async lastSeenCursor(cursor: string) {
        return await this.fetch(ENDPOINTS.last_seen_cursor, { cursor });
    }

    /**
     * Get amount of unread notifications
     * 
     * @returns Unread count
     * @since 0.1.0
     */
    async getUnreadCount() {
        return await this.fetch(ENDPOINTS.badge_count);
    }

    

    /**
     * Get tweets of a timeline
     * 
     * @param [args] {@link TimelineGetArgs}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    getTimeline(args?: TimelineGetArgs): Timeline<TweetKind>;
    /**
     * Get tweets of a generic timeline by its id
     * 
     * @param id Generic timeline id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    getTimeline(id: string, args?: CursorOnly): Timeline<TweetKind>;

    async* getTimeline(idOrArgs?: string | TimelineGetArgs, args?: CursorOnly): Timeline<TweetKind> {
        if (typeof idOrArgs === 'string') {
            yield* this.getSlice(args, args => this.getTimelineSlice(idOrArgs, args));
        } else {
            yield* this.getSlice(idOrArgs, args => this.getTimelineSlice(args));
        }

        return EMPTY_SLICE;
    }

    protected async getTimelineSlice(args?: TimelineGetArgs): Promise<TwitterResponse<Slice<TweetKind>>>;
    protected async getTimelineSlice(id: string, args?: CursorOnly): Promise<TwitterResponse<Slice<TweetKind>>>;

    protected async getTimelineSlice(idOrArgs: string | TimelineGetArgs = {}, args?: CursorOnly) {
        if (typeof idOrArgs === 'string') {
            return await this.fetch(ENDPOINTS.GenericTimelineById.default, { timelineId: idOrArgs, cursor: args?.cursor });
        }

        const seenTweetIds = idOrArgs.seenTweetIds?.map(String) ?? [];
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
     * @param [args] {@link SearchTweetArgs}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* search(query: string | Query | QueryBuilder, args?: SearchTweetArgs): Timeline<TweetKind> {
        const orderBy: SearchOrder = args?.orderBy === SearchOrder.Latest || args?.orderBy === SearchOrder.Relevant
            ? args.orderBy
        : args?.kind === SearchOrder.Latest || args?.kind === SearchOrder.Relevant
            ? args.kind
            : SearchOrder.Relevant;

        delete args?.kind;

        yield* this.getSlice({ ...args, orderBy }, args => this.searchSlice(query, args));
        return EMPTY_SLICE;
    }

    /**
     * Search users
     * 
     * @param query Query
     * @param [args] {@link SearchTweetArgs}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* searchUsers(query: string, args?: SearchArgs): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.searchUsersSlice(query, args));
        return EMPTY_SLICE;
    }

    /**
     * Search lists
     * 
     * @param query Query
     * @param [args] {@link SearchTweetArgs}
     * @yields Slice of lists
     * @since 0.1.0
     */
    async* searchLists(query: string, args?: SearchArgs): Timeline<ListKind> {
        yield* this.getSlice(args, args => this.searchListsSlice(query, args));
        return EMPTY_SLICE;
    }

    protected async searchSlice(query: string | Query | QueryBuilder, args?: SearchTweetArgs): Promise<TwitterResponse<Slice<TweetKind>>> {
        const product = args?.orderBy === SearchOrder.Relevant ? 'Top' : 'Latest';
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: Query.parse(query), querySource: args?.source ?? 'typed_query', product, cursor: args?.cursor });
    }

    protected async searchUsersSlice(query: string, args?: SearchArgs): Promise<TwitterResponse<Slice<UserKind>>> {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: query, querySource: args?.source ?? 'typed_query', product: 'People', cursor: args?.cursor });
    }

    protected async searchListsSlice(query: string, args?: SearchArgs): Promise<TwitterResponse<Slice<ListKind>>> {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: query, querySource: args?.source ?? 'typed_query', product: 'Lists', cursor: args?.cursor });
    }

    /**
     * Get search auto-completion users and topics
     * 
     * @param query Query
     * @returns Search typeahead
     * @since 0.1.0
     */
    async typeahead(query: string) {
        return await this.fetch(ENDPOINTS.search_typeahead, { q: query });
    }



    /**
     * Creates a new tweet with the specified content. A note tweet will be created if required by text (max 280) or media (max 4) array length, and allowed in options
     * 
     * Additional thread tweets will be created with individual requests, as Twitter doesn't have an official way of handling this
     * 
     * @param args {@link TweetCreateArgs}
     * @param [thread] Additional tweets
     * @returns Tweet
     * @since 0.1.0
     */
    async createTweet(args: TweetCreateArgs, thread?: ThreadTweetArgs[]): Promise<TwitterResponse<Tweet>> {
        const text = args.text ?? '';

        if (!TWEET_TEXT_RANGE.contains(text.length) && this.options.longTweetBehavior === 'Fail') {
            return {
                errors: [new ValidationError('Tweet text is too long', {
                    field: 'text',
                    value: text.length,
                    expected: [TWEET_TEXT_RANGE],
                    cause: new RangeError(`text.length ${text.length} out of range: ${TWEET_TEXT_RANGE}`)
                })]
            };
        }

        const mode = match(args.replyPermission, [
            [ReplyPermission.Following, 'Community'],
            [ReplyPermission.Verified, 'Verified'],
            [ReplyPermission.Following, 'ByInvitation']
        ] as const);

        if (!TWEET_TEXT_RANGE.contains(text.length) && (this.options.longTweetBehavior === 'NoteTweet' || this.options.longTweetBehavior === 'NoteTweetUnchecked')) {
            return {
                errors: [new FormatterError('Not implemented')]
            };
        }

        if (args.mediaIds && !TWEET_MEDIA_RANGE.contains(args.mediaIds.length)) {
            return {
                errors: [new ValidationError('Too many media attachements', {
                    field: 'mediaIds',
                    value: args.mediaIds.length,
                    expected: [TWEET_MEDIA_RANGE],
                    cause: new RangeError(`mediaIds.length (${args.mediaIds.length}) out of range: ${TWEET_MEDIA_RANGE}`)
                })]
            };
        }

        let cardUri: string | undefined = undefined;

        if (args.card?.kind === 'Poll') {
            if (!TWEET_POLL_RANGE.contains(args.card.choices.length)) {
                return {
                    errors: [new ValidationError(args.card.choices.length < TWEET_POLL_RANGE.start ? 'Too few poll choices' : 'Too many poll choices', {
                        field: 'card',
                        value: args.card.choices.length,
                        expected: [TWEET_POLL_RANGE],
                        cause: new RangeError(`card.choices.length (${args.card.choices.length}) out of range: ${TWEET_POLL_RANGE}`)
                    })]
                };
            }

            const hasImage = args.card.choices.some(choice => !!choice.mediaId);

            const { errors, data: uri } = await this.fetch(ENDPOINTS.cards_create, {
                card_data: JSON.stringify({
                    'twitter:api:api:endpoint': '1',
                    'twitter:card': hasImage ? `1906814671912599552:poll_choice_images` : `poll${args.card.choices.length}choice_text_only`,
                    'twitter:long:duration_minutes': Math.floor(args.card.duration / 60),
                    'twitter:string:choice1_label': args.card!.choices.at(0)!.text,
                    'twitter:image:choice1_image:src:id': hasImage ? `mis://${args.card!.choices.at(0)!.mediaId}` : undefined,
                    'twitter:string:choice2_label': args.card!.choices.at(1)!.text,
                    'twitter:image:choice2_image:src:id': hasImage ? `mis://${args.card!.choices.at(1)!.mediaId}` : undefined,
                    'twitter:string:choice3_label': args.card!.choices.at(2)?.text,
                    'twitter:image:choice3_image:src:id': hasImage ? `mis://${args.card!.choices.at(2)?.mediaId}` : undefined,
                    'twitter:string:choice4_label': args.card!.choices.at(3)?.text,
                    'twitter:image:choice4_image:src:id': hasImage ? `mis://${args.card!.choices.at(3)?.mediaId}` : undefined
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
            content_disclosure: args.contentDisclosures?.isAiGenerated || args.contentDisclosures?.isSponsored ? {
                advertising_promotion: args.contentDisclosures.isSponsored ? {
                    is_paid_promotion: !!args.contentDisclosures.isSponsored
                } : undefined,
                ai_generated_disclosure: args.contentDisclosures.isAiGenerated ? {
                    has_ai_generated_media: !!args.contentDisclosures.isAiGenerated
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
     * @since 0.1.0
     */
    async deleteTweet(id: string) {
        return await this.fetch(ENDPOINTS.DeleteTweet, { tweet_id: id });
    }

    /**
     * Schedule a tweet
     * 
     * @param args {@link ScheduledTweetCreateArgs}
     * @returns Scheduled tweet id
     * @since 1.0.0-rc.0
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
     * @since 1.0.0-rc.0
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
     * @since 0.1.0
     */
    async* getTweet(id: string, args?: TweetGetArgs): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getTweetSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getTweetSlice(id: string, args?: TweetGetArgs) {
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
     * @since 0.6.0
     */
    async getTweetResult(id: string) {
        return await this.fetch(ENDPOINTS.TweetResultByRestId, { tweetId: id });
    }

    /**
     * Get tweets by their ids
     * 
     * @param ids Tweet ids
     * @returns Array of tweets
     * @since 0.6.0
     */
    async getTweetResults(ids: string[]) {
        return await this.fetch(ENDPOINTS.TweetResultsByRestIds, { tweetIds: ids });
    }

    /**
     * Translate a tweet to `language` using Grok
     * 
     * @param id Tweet id
     * @param [language] Desired language. Defaults to client language if omitted
     * @returns Translated text
     * @since 1.0.0-rc.0
     */
    async translateTweet(id: string, language?: string) {
        return await this.fetch(ENDPOINTS.grok_translation, { dst_lang: language ?? this.options.language, id });
    }

    /**
     * Get hidden replies on a tweet
     * 
     * @param tweetId Tweet id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* getHiddenReplies(tweetId: string, args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getHiddenRepliesSlice(tweetId, args));
        return EMPTY_SLICE;
    }

    protected async getHiddenRepliesSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ModeratedTimeline, { rootTweetId: tweetId, ...args });
    }

    /**
     * Get users that liked a tweet by the tweet's id. In ~June 2024, liked tweet were made private, so this method will return an empty array if you aren't the author of the tweet
     * 
     * @param tweetId Tweet id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getLikes(tweetId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getLikesSlice(tweetId, args));
        return EMPTY_SLICE;
    }

    protected async getLikesSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Favoriters, { tweetId: tweetId, ...args });
    }

    /**
     * Get users that retweeted a tweet by the tweet's id
     * 
     * @param tweetId Tweet id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getRetweets(tweetId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getRetweetsSlice(tweetId, args));
        return EMPTY_SLICE;
    }

    protected async getRetweetsSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Retweeters, { tweetId: tweetId, ...args });
    }

    /**
     * Get quote tweets to a tweet by the original tweet's id
     * 
     * @param tweetId Original tweet's id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* getQuoteTweets(tweetId: string, args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getQuoteTweetsSlice(tweetId, args));
        return EMPTY_SLICE;
    }

    protected async getQuoteTweetsSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: `quoted_tweet_id:${tweetId}`, querySource: 'tdqt', product: 'Top', ...args }) as TwitterResponse<Slice<TweetKind>>;
    }

    /**
     * Bookmark a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async bookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateBookmark, { tweet_id: tweetId });
    }

    /**
     * Unbookmark a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async unbookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteBookmark, { tweet_id: tweetId });
    }

    /**
     * Like a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async like(tweetId: string) {
        return await this.fetch(ENDPOINTS.FavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Unlike a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async unlike(tweetId: string) {
        return await this.fetch(ENDPOINTS.UnfavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Retweet a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async retweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateRetweet, { tweet_id: tweetId });
    }

    /**
     * Unretweet a tweet
     * 
     * @param tweetId Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async unretweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteRetweet, { source_tweet_id: tweetId });
    }

    /**
     * Hide a reply on a tweet you created. It will still be visible in hidden replies
     * 
     * @param id Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async hideTweet(id: string) {
        return await this.fetch(ENDPOINTS.ModerateTweet, { tweetId: id });
    }

    /**
     * Unhide a hidden reply
     * 
     * @param id Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async unhideTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnmoderateTweet, { tweetId: id });
    }

    /**
     * Set a tweet you created as your pinned tweet
     * 
     * @param id Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async pinTweet(id: string) {
        return await this.fetch(ENDPOINTS.PinTweet, { tweet_id: id });
    }

    /**
     * Remove your pinned tweet
     * 
     * @param id Your current pinned tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async unpinTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnpinTweet, { tweet_id: id });
    }

    /**
     * Vote on a poll
     * 
     * @param args {@link TweetVoteArgs}
     * @returns Success status
     * @since 0.1.0
     */
    async vote(args: TweetVoteArgs): Promise<TwitterResponse<boolean>> {
        if (!TWEET_POLL_RANGE.contains(args.choice)) {
            return {
                errors: [new ValidationError('Invalid', {
                    field: 'choice',
                    value: args.choice,
                    expected: [TWEET_POLL_RANGE],
                    cause: new RangeError(`choice out of range: ${TWEET_POLL_RANGE}`)
                })]
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
     * @since 0.2.0
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
     * @since 0.6.0
     */
    async unmention(id: string) {
        return await this.fetch(ENDPOINTS.UnmentionUserFromConversation, { tweet_id: id });
    }

    /**
     * Mute a tweet, preventing you from getting notifications relating to it
     * 
     * @param id Tweet id
     * @returns Success status
     * @since 0.1.0
     */
    async muteTweet(id: string) {
        return await this.fetch(ENDPOINTS.mutes_conversations_create, { tweet_id: id });
    }

    /**
     * Unmute a tweet
     * 
     * @param id Tweet id
     * @returns Success status
     * @since 0.1.0
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
     * @since 0.1.0
     */
    async getUser(id: string, args?: ByUsername) {
        const result = await (args?.byUsername
            ? this.fetch(ENDPOINTS.UserByScreenName, { screen_name: id })
            : this.fetch(ENDPOINTS.UserByRestId, { userId: id })
        );
        
        if (result.errors.length > 0) {
            return result;
        }

        if (result.data?.__typename === 'User' && this.self?.id === result.data.id) {
            this.self = result.data;
        }

        return result;
    }

    /**
     * Get multiple users by their ids, or usernames if specified
     * 
     * @param ids User ids or usernames
     * @param [args] {@link ByUsername}
     * @returns Users
     * @since 0.1.0
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
     * @since 0.1.0
     */
    async* getUserTweets(id: string, args?: UserTweetsGetArgs): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getUserTweetsSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getUserTweetsSlice(id: string, args?: UserTweetsGetArgs) {
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
     * @since 0.1.0
     */
    async* getUserMedia(id: string, args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getUserMediaSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getUserMediaSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserMedia, { userId: id, ...args });
    }

    /**
     * Get liked tweets of a user chronologically (ordered by the time when each tweet was liked instead of when the tweets were created)
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* getUserLikes(id: string, args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getUserLikesSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getUserLikesSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Likes, { userId: id, ...args });
    }

    /**
     * Get highlighted tweets from a user. Highlighting tweets is a feature only available to verified users
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of tweets
     * @since 0.1.0
     */
    async* getUserHighlightedTweets(id: string, args?: CursorOnly): Timeline<TweetKind> {
        yield* this.getSlice(args, args => this.getUserHighlightedTweetsSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getUserHighlightedTweetsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserHighlightsTweets, { userId: id, ...args });
    }

    /**
     * Get followed users of a user
     * 
     * @param userId User id 
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getFollowing(userId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getFollowingSlice(userId, args));
        return EMPTY_SLICE;
    }

    protected async getFollowingSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Following, { userId: userId, ...args });
    }

    /**
     * Get followers of a user
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getFollowers(userId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getFollowersSlice(userId, args));
        return EMPTY_SLICE;
    }

    protected async getFollowersSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Followers, { userId: userId, ...args });
    }

    /**
     * Get followers of a user that you also follow
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getFollowersYouKnow(userId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getFollowersYouKnowSlice(userId, args));
        return EMPTY_SLICE;
    }

    protected async getFollowersYouKnowSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.FollowersYouKnow, { userId: userId, ...args });
    }

    /**
     * Get verified followers of a user
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getVerifiedFollowers(userId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getVerifiedFollowersSlice(userId, args));
        return EMPTY_SLICE;
    }

    protected async getVerifiedFollowersSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BlueVerifiedFollowers, { userId: userId, ...args });
    }

    /**
     * Get super followed users of a user. Note that super follows can be set to private
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getSuperFollowing(userId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getSuperFollowingSlice(userId, args));
        return EMPTY_SLICE;
    }

    protected async getSuperFollowingSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserCreatorSubscriptions, { userId: userId, ...args });
    }

    /**
     * Get affiliates of a business account by the business account's id
     * 
     * @param userId User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of users
     * @since 0.1.0
     */
    async* getAffiliates(userId: string, args?: CursorOnly): Timeline<UserKind> {
        yield* this.getSlice(args, args => this.getAffiliatesSlice(userId, args));
        return EMPTY_SLICE;
    }

    protected async getAffiliatesSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserBusinessProfileTeamTimeline, { userId: userId, teamName: 'NotAssigned', ...args });
    }

    /**
     * Get lists created by a user
     * 
     * @param id User id
     * @param [args] {@link CursorOnly}
     * @yields Slice of lists
     * @since 0.1.0
     */
    async* getUserLists(id: string, args?: CursorOnly): Timeline<ListKind> {
        yield* this.getSlice(args, args => this.getUserListsSlice(id, args));
        return EMPTY_SLICE;
    }

    protected async getUserListsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CombinedLists, { userId: id, ...args });
    }

    /**
     * Follow a user
     * 
     * @param id User id
     * @param [args] {@link ByUsername}
     * @returns Success status
     * @since 0.1.0
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
     * @since 0.1.0
     */
    async unfollowUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Allow retweets from a followed user to show up on your timeline
     * 
     * @param userId User id
     * @returns Success status
     * @since 0.2.0
     */
    async enableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: true });
    }

    /**
     * Forbid retweets from a followed user to show up on your timeline
     * 
     * @param userId User id
     * @returns Success status
     * @since 0.2.0
     */
    async disableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: false });
    }

    /**
     * Enable receiveing tweet notifications from a user
     * 
     * @param userId User id
     * @returns Success status
     * @since 0.2.0
     */
    async enableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: true });
    }

    /**
     * Disable receiveing tweet notifications from a user
     * 
     * @param userId User id
     * @returns Success status
     * @since 0.2.0
     */
    async disableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: false });
    }

    /**
     * Get incoming follow requests
     * 
     * @param [args] {@link CursorOnly}
     * @returns User ids
     * @since 0.1.0
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
     * @since 0.1.0
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
     * @since 0.1.0
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
     * @since 0.1.0
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
     * @since 0.1.0
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
     * @since 0.1.0
     */
    async unblockUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.blocks_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Remove a user from following you
     * 
     * @param id User id
     * @returns Success status
     * @since 1.0.0-rc.0
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
     * @since 0.1.0
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
     * @since 0.1.0
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
     * @since 0.6.0
     */
    async upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => any): Promise<TwitterResponse<MediaData>> {
        const append = async (id: string, data: ArrayBuffer, index: number, contentType: string) => {
            let formData = new FormData();
            formData.append('media', new Blob([data], { type: contentType }));

            const endpoint = ENDPOINTS.media_upload.append;

            // media upload appends use the request function directly because this.fetch isn't set up to accept FormData bodies
            return await request<typeof endpoint>({
                endpoint: endpoint,
                params: { media_id: id, segment_index: index },
                cookies: this.#cookies,
                mediaFormData: formData,
                options: this.options,
                proxyAgent: this.#proxyAgent,
                transactionId: await this.getTransactionId(endpoint)
            });
        };

        const { errors, data: init } = await this.fetch(ENDPOINTS.media_upload.init, {
            total_bytes: media.byteLength.toString(),
            media_type: args.contentType,
            media_category: args.contentType.startsWith('video/') ? 'tweet_video' : args.contentType.endsWith('gif') ? 'tweet_gif' : 'tweet_image'
        });

        if (errors.length && !init) {
            return { errors };
        } else if (!init) {
            return {
                errors: [DivineInterventionError.UNKNOWN]
            };
        }

        const chunkSize = args.segmentSizeOverride || UPLOAD_SEGMENT_SIZE;
        const chunksNeeded = Math.ceil(media.byteLength / chunkSize);

        const chunks = [...Array(chunksNeeded).keys()].map(index => media.slice(index * chunkSize, (index + 1) * chunkSize));

        for (const [index, chunk] of chunks.entries()) {
            let response: Response;
            try {
                [, response] = await append(init.media_id_string, chunk, index, args.contentType);
            } catch (error) {
                return {
                    errors: [error instanceof TwitterError ? error : new DivineInterventionError('Request function threw an unknown error', { cause: error })]
                };
            }

            if (!response.ok) {
                return {
                    errors: [new RequestError('An unknown error occured while appending new media segment', {
                        endpoint: ENDPOINTS.media_upload.append,
                        params: { media_id: init.media_id_string, segment_index: index }
                    })],
                    response: this.options.includeResponse ? response : undefined
                };
            }

            callback?.(chunk, index, chunksNeeded);
        }

        const final = await this.fetch(ENDPOINTS.media_upload.finalize, { media_id: init.media_id_string });

        let altTextErrors: TwitterError[] = [];
        if (!!final.data && !!args.altText) {
            ({ errors: altTextErrors } = await this.addAltText(init!.media_id_string, args.altText));
        }

        return {
            data: final.data,
            errors: [...final.errors, ...altTextErrors],
            response: final.response
        };
    }

    /**
     * Check the current status of an uploaded media file
     * 
     * @param id Media id
     * @returns Media
     * @since 0.6.0
     */
    async mediaStatus(id: string) {
        return await this.fetch(ENDPOINTS.media_upload.status, { media_id: id });
    }

    /**
     * Add ALT text to an uploaded media
     * 
     * @param id Media id
     * @param text ALT text
     * @returns Success status
     * @since 0.6.0
     */
    async addAltText(id: string, text: string) {
        return await this.fetch(ENDPOINTS.media_metadata_create, {
            allow_download_status: { allow_download: 'true' },
            alt_text: { text },
            media_id: id
        });
    }
}
