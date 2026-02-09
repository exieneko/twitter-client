import logger from 'node-color-log';
import { hrtime } from 'process';
import { fetch, FormData, ProxyAgent } from 'undici';
import { ClientTransaction, handleXMigration } from 'x-client-transaction-id';

import { MAX_ACCEPTABLE_REQUEST_TIME, ENDPOINTS, HEADERS, PUBLIC_TOKEN, EMPTY_SLICE, MAX_TIMELINE_ITERATIONS, TWEET_CHARACTER_LIMIT } from './consts.js';
import type { Media, TweetKind, Tweet, Slice, User, UserKind, Notification, ListKind } from './types/index.js';
import { endpointKind, toSearchParams } from './utils/index.js';
import type { BirdwatchRateNoteArgs, BlockedAccountsGetArgs, ByUsername, CommunityTimelineGetArgs, CursorOnly, Endpoint, BySlug, ListCreateArgs, MediaUploadArgs, NotificationGetArgs, Params, ScheduledTweetCreateArgs, SearchArgs, ThreadTweetArgs, TimelineGetArgs, Tokens, TweetCreateArgs, TweetGetArgs, TweetReplyPermission, TwitterResponse, UnsentTweetsGetArgs, UpdateProfileArgs, Options, EndpointKind, Timeline, UserTweetsGetArgs } from './utils/types/index.js';
import { QueryBuilder } from './utils/types/querybuilder.js';

export class TwitterClient {
    #transaction: ClientTransaction;
    #tokens: Tokens;
    #options: Options;
    public twid?: string;
    public self?: User;

    private constructor(transaction: ClientTransaction, tokens: Tokens, options: Options) {
        this.#transaction = transaction;
        this.#tokens = tokens;
        this.#options = options;

        if (this.#options.language === 'en-US' || this.#options.language === 'en-GB') {
            this.#options.language = 'en';
        }
    }

    /**
     * Creates a new `TwitterClient`
     * 
     * Default options:
     * 
     * ```ts
     * {
     *     autoFetchSelf: true,
     *     domain: 'twitter.com',
     *     language: 'en',
     *     longTweetBehavior: 'Force',
     *     proxyUrl: undefined,
     *     twid: undefined,
     *     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
     *     verbose: false
     * }
     * ```
     * 
     * @param tokens Your Twitter account's login tokens
     * @param options Additional options
     * @constructor 
     */
    public static async new(tokens: Tokens, options?: Partial<Options>): Promise<TwitterClient> {
        const document = await handleXMigration();
        const transaction = await ClientTransaction.create(document);

        const client = new TwitterClient(
            transaction,
            tokens,
            {
                autoFetchSelf: true,
                domain: 'twitter.com',
                language: 'en',
                longTweetBehavior: 'Force',
                proxyUrl: undefined,
                twid: undefined,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                verbose: false,
                ...options
            }
        );

        client.log('Initialized TwitterClient');

        if (client.#options.language !== 'en') {
            client.warn('Setting `language` to values other than "en" may have unexpected effects - if you find any bugs, please open an issue here: https://github.com/exieneko/twitter-client/issues <3');
        }

        client.twid = client.#options.twid;

        if (client.#options.autoFetchSelf) {
            const { errors, data: settings } = !!client.twid ? { errors: [] } : await client.getSettings();

            if (errors.length > 0) {
                client.error(`Failed to set \`self\` because of errors while calling \`getSettings()\`: ${errors}`);
            }

            const { errors: userErrors, data: user } = await client.getUser(client.twid || settings!.username, { byUsername: !client.twid });

            if (userErrors.length > 0) {
                client.error(`Failed to set \`self\` because of errors while calling \`getUser(${client.twid || settings?.username}, { byUsername: ${!client.twid} })\`: ${userErrors}`);
            }

            if (user?.__typename !== 'User') {
                client.error(`Failed to set \`self\` because response data returned a suspended or unavailable user`);
                return client;
            }

            client.self = user;
            client.twid = user.id;
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

    private getHeaders(token?: string, endpointKind: EndpointKind = 'GraphQL', url?: string, transactionId?: string): Record<string, string> {
        const tokenHeaders = () => {
            const twid = this.twid ?? this.self?.id;

            return {
                'x-csrf-token': this.#tokens.csrf,
                cookie: !!twid
                    ? `auth_token=${this.#tokens.authToken}; ct0=${this.#tokens.csrf}; twid=u%3D${twid}; lang=${this.#options.language}`
                    : `auth_token=${this.#tokens.authToken}; ct0=${this.#tokens.csrf}; lang=${this.#options.language}`
            };
        }

        let result: Record<string, string> = transactionId ? { 'x-client-transaction-id': transactionId } : {};

        const contentType = endpointKind === 'GraphQL'
            ? 'application/json'
        : endpointKind === 'Media'
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

    private getAgent() {
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
            const response = await (endpointKind(endpoint) === 'GraphQL'
                ? (endpoint.method === 'GET'
                    ? fetch(url + toSearchParams({ variables: { ...endpoint.variables, ...params }, features: endpoint.features }), {
                        method: endpoint.method,
                        headers,
                        dispatcher: this.getAgent()
                    })
                    : fetch(url, {
                        method: endpoint.method,
                        headers,
                        body: JSON.stringify({
                            variables: { ...endpoint.variables, ...params },
                            features: endpoint.features,
                            queryId: endpoint.url.split('/', 1)[0]
                        }),
                        dispatcher: this.getAgent()
                    })
                )
                : fetch(endpoint.method === 'GET' && body ? `${url}?${body}` : url, {
                    method: endpoint.method,
                    headers,
                    body: endpoint.method === 'POST' && body ? body : undefined,
                    dispatcher: this.getAgent()
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
                    errors: data.errors
                };
            }

            try {
                return {
                    errors: data?.errors || [],
                    data: endpoint.parser(data)
                };
            } catch (error: any) {
                return {
                    errors: [{
                        code: -1,
                        message: String(error.stack)
                    }]
                };
            }
        } catch (error: any) {
            return {
                errors: [{
                    code: -1,
                    message: String(error.stack)
                }]
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
     * Gets blocked accounts
     * 
     * Arguments:
     * 
     * + `imported?: boolean = false` - Get imported bookmarks only?
     * + `cursor?: string`
     * 
     * @param args Arguments
     * @yields Slice of blocked accounts
     */
    public async* getBlockedAccounts(args?: BlockedAccountsGetArgs): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, this.getBlockedAccountsSlice)) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets blocked accounts
     * 
     * Arguments:
     * 
     * + `imported?: boolean = false` - Get imported bookmarks only?
     * + `cursor?: string`
     * 
     * @param args Arguments
     * @returns Slice of blocked accounts
     */
    public async getBlockedAccountsSlice(args?: BlockedAccountsGetArgs) {
        if (args?.imported) {
            return await this.fetch(ENDPOINTS.BlockedAccountsImported, { cursor: args?.cursor });
        }

        return await this.fetch(ENDPOINTS.BlockedAccountsAll, { cursor: args?.cursor });
    }

    /**
     * Get muted accounts* 
     * @param args Cursor only
     * @yields Slice of muted accounts
     */
    public async* getMutedAccounts(args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, this.getMutedAccountsSlice)) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Get muted accounts* 
     * @param args Cursor only
     * @returns Slice of muted accounts
     */
    public async getMutedAccountsSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.MutedAccounts, args);
    }

    /**
     * Gets account settings
     * @returns Settings
     */
    public async getSettings() {
        return await this.fetch(ENDPOINTS.account_settings);
    }

    /**
     * Update profile data. Requires all data to be set
     * 
     * Arguments:
     * 
     * + `name: string`
     * + `description: string`
     * + `location: string`
     * + `url: string`
     * + `birthday: Date` - Birthday represented by a `Date` (time ignored)
     * + `birthYearVisibility: 'Private' | 'Followers' | 'Following' | 'Mutuals' | 'Public'` - Visibility of birth year
     * + `birthDayVisibility: 'Private' | 'Followers' | 'Following' | 'Mutuals' | 'Public'` - Visibility of birth day
     * 
     * @param args Arguments
     * @returns `true` on success
     */
    public async updateProfile(args: UpdateProfileArgs) {
        return await this.fetch(ENDPOINTS.account_update_profile, {
            name: args.name,
            description: args.description,
            location: args.location,
            url: args.url,
            birthdate_year: args.birthday.getFullYear(),
            birthdate_month: args.birthday.getMonth() + 1,
            birthdate_day: args.birthday.getDate(),
            birthdate_year_visibility: args.birthYearVisibility === 'Private'
                ? 'self'
            : args.birthYearVisibility === 'Mutuals'
                ? 'mutualfollow'
            : args.birthYearVisibility === 'Followers'
                ? 'followers'
            : args.birthYearVisibility === 'Following'
                ? 'following'
                : 'public',
            birthdate_visibility: args.birthDayVisibility === 'Private'
                ? 'self'
            : args.birthDayVisibility === 'Mutuals'
                ? 'mutualfollow'
            : args.birthDayVisibility === 'Followers'
                ? 'followers'
            : args.birthDayVisibility === 'Following'
                ? 'following'
                : 'public'
        });
    }

    /**
     * Changes avatar to something else
     * @param mediaId Uploaded media id
     * @returns `true` on success
     */
    public async setAvatar(mediaId: string) {
        return await this.fetch(ENDPOINTS.account_update_profile_image, { media_id: mediaId });
    }

    /**
     * Gets the currently logged-in user based only on their tokens
     * @returns User
     */
    public async verifyCredentials() {
        return await this.fetch(ENDPOINTS.account_verify_credentials);
    }



    /**
     * Gets all Birdwatch notes on a given tweet
     * @param id Tweet id
     * @returns All NN and NNN notes on a tweet
     */
    public async getBirdwatchNotesOnTweet(id: string) {
        return await this.fetch(ENDPOINTS.BirdwatchFetchNotes, { tweet_id: id });
    }

    /**
     * Gets a Birdwatch contributor based on their alias
     * @param alias 
     * @returns Birdwatch user
     */
    public async getBirdwatchUser(alias: string) {
        return await this.fetch(ENDPOINTS.BirdwatchFetchBirdwatchProfile, { alias });
    }

    /**
     * Rates a Birdwatch note.
     * The helpfulness level (Helpful, Somewhat helpful, Not helpful) will be inferred based on the `helpful_tags` and `unhelpful_tags` arrays provided in `args`
     * 
     * Arguments:
     * 
     * + `tweetId: string` - id of the tweet the note is on
     * + `helpful_tags?: BirdwatchHelpfulTag[]`
     * + `unhelpful_tags?: BirdwatchUnhelpfulTag[]`
     * 
     * @param noteId 
     * @param args Arguments
     * @returns `true` on success
     */
    public async rateBirdwatchNote(noteId: string, args: BirdwatchRateNoteArgs) {
        return await this.fetch(ENDPOINTS.BirdwatchCreateRating, {
            data_v2: {
                helpfulness_level: args.helpful_tags?.length && args.unhelpful_tags?.length ? 'SomewhatHelpful' : args.unhelpful_tags?.length ? 'NotHelpful' : 'Helpful',
                helpful_tags: args.helpful_tags,
                not_helpful_tags: args.unhelpful_tags
            },
            note_id: noteId,
            rating_source: 'BirdwatchHomeNeedsYourHelp',
            source_platform: 'BirdwatchWeb',
            tweet_id: args.tweetId
        });
    }

    /**
     * Removes a Birdwatch note rating
     * @param noteId 
     * @returns `true` on success
     */
    public async unrateBirdwatchNote(noteId: string) {
        return await this.fetch(ENDPOINTS.BirdwatchDeleteRating, { note_id: noteId });
    }



    /**
     * Gets bookmarks
     * @param args Cursor only
     * @yields Slice of bookmarked tweets
     */
    public async* getBookmarks(args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getBookmarksSlice(args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets bookmarks
     * @param args Cursor only
     * @returns Slice of bookmarked tweets
     */
    public async getBookmarksSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Bookmarks, args);
    }

    /**
     * Searches through bookmarked tweets
     * @param query 
     * @param args Cursor only
     * @yields Slice of bookmarked tweets
     */
    public async* searchBookmarks(query: string | QueryBuilder, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.searchBookmarksSlice(query, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Searches through bookmarked tweets
     * @param query 
     * @param args Cursor only
     * @returns Slice of bookmarked tweets
     */
    public async searchBookmarksSlice(query: string | QueryBuilder, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BookmarkSearchTimeline, { rawQuery: typeof query === 'string' ? query : query.toString(), ...args });
    }

    /**
     * Clears bookmarked status on all tweets
     * @returns `true` on success
     */
    public async clearBookmarks() {
        return await this.fetch(ENDPOINTS.BookmarksAllDelete);
    }



    /**
     * Gets a Twitter community by its id
     * @param id 
     * @returns Community
     */
    public async getCommunity(id: string) {
        return await this.fetch(ENDPOINTS.CommunityByRestId, { communityId: id });
    }

    /**
     * Gets tweets in a given community
     * 
     * Arguments:
     * 
     * + `sort?: 'Relevant' | 'Recent' = 'Relevant'` - Sort tweets by
     * + `cursor?: string`
     * 
     * @param id Community id
     * @param args Arguments
     * @yields Slice of tweets
     */
    public async* getCommunityTweets(id: string, args?: CommunityTimelineGetArgs): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getCommunityTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets tweets in a given community
     * 
     * Arguments:
     * 
     * + `sort?: 'Relevant' | 'Recent' = 'Relevant'` - Sort tweets by
     * + `cursor?: string`
     * 
     * @param id Community id
     * @param args Arguments
     * @returns Slice of tweets
     */
    public async getCommunityTweetsSlice(id: string, args?: CommunityTimelineGetArgs) {
        const rankingMode = args?.sort === 'Recent' ? 'Recency' : 'Relevance';
        return await this.fetch(ENDPOINTS.CommunityTweetsTimeline, { communityId: id, rankingMode, cursor: args?.cursor });
    }

    /**
     * Gets tweets containing media in a given community
     * @param id Community id
     * @param args Cursor only
     * @yields Slice of media tweets
     */
    public async* getCommunityMedia(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getCommunityMediaSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets tweets containing media in a given community
     * @param id Community id
     * @param args Cursor only
     * @returns Slice of media tweets
     */
    public async getCommunityMediaSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CommunityMediaTimeline, { communityId: id, ...args });
    }

    /**
     * Joins a community
     * @param id Community id
     * @returns `true` on success
     */
    public async joinCommunity(id: string) {
        return await this.fetch(ENDPOINTS.JoinCommunity, { communityId: id });
    }

    /**
     * Leaves a community
     * @param id Community id
     * @returns `true` on success
     */
    public async leaveCommunity(id: string) {
        return await this.fetch(ENDPOINTS.LeaveCommunity, { communityId: id });
    }



    /**
     * Gets a Twitter list by its id or slug
     * 
     * Arguments:
     * + `bySlug?: boolean = false` - Use slug instead?
     * 
     * @param id List id or slug
     * @param args Arguments
     * @returns List matching the id
     */
    public async getList(id: string, args?: BySlug) {
        if (args?.bySlug) {
            return await this.fetch(ENDPOINTS.ListBySlug, { listId: id });
        }

        return await this.fetch(ENDPOINTS.ListByRestId, { listId: id });
    }

    /**
     * Gets tweets by users on a given list
     * @param id 
     * @param args Cursor only
     * @yields Slice of tweets
     */
    public async* getListTweets(id: string, args?: CursorOnly) {
        for await (const slice of this.getSlice(args, args => this.getListTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets tweets by users on a given list
     * @param id 
     * @param args Cursor only
     * @returns Slice of tweets
     */
    public async getListTweetsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListLatestTweetsTimeline, { listId: id, ...args });
    }

    /**
     * Gets list discovery page
     * @returns Slice of lists
     */
    public async getListDiscovery() {
        return await this.fetch(ENDPOINTS.ListsDiscovery);
    }

    /**
     * Gets lists you're a member of
     * @param args Cursor only
     * @returns Slice of lists
     */
    public async listedOn(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMemberships, args);
    }

    public async getOwnedLists(userId: string, otherUserId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListOwnerships, { userId, isListMemberTargetUserId: otherUserId, ...args });
    }

    /**
     * Gets members of a list
     * @param id 
     * @param args Cursor only
     * @yields Slice of users on list
     */
    public async* getListMembers(id: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getListMembersSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets members of a list
     * @param id 
     * @param args Cursor only
     * @returns Slice of users on list
     */
    public async getListMembersSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMembers, { listId: id, ...args });
    }

    /**
     * Gets subscribers of a list
     * @param id 
     * @param args Cursor only
     * @yields Slice of users subscribed to the list
     */
    public async* getListSubscribers(id: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getListSubscribersSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets subscribers of a list
     * @param id 
     * @param args Cursor only
     * @returns Slice of users subscribed to the list
     */
    public async getListSubscribersSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListSubscribers, { listId: id, ...args });
    }

    /**
     * Creates a new List
     * 
     * Arguments:
     * 
     * + `name: string`
     * + `description?: string`
     * + `private?: boolean = false` - Controls if other users can see this list too
     * 
     * @param args Arguments
     * @returns The created list
     */
    public async createList(args: ListCreateArgs) {
        return await this.fetch(ENDPOINTS.CreateList, { name: args.name, description: args.description || '', isPrivate: !!args.private });
    }

    /**
     * Edits an existing owned list
     * @param id 
     * @param args Arguments are same as list creation, but required
     * @returns `true` on success
     */
    public async editList(id: string, args: Required<ListCreateArgs>) {
        return await this.fetch(ENDPOINTS.UpdateList, { listId: id, name: args.name, description: args.description, isPrivate: args.private });
    }

    /**
     * Deletes an existing owned list
     * @param id 
     * @returns `true` on success
     */
    public async deleteList(id: string) {
        return await this.fetch(ENDPOINTS.DeleteList, { listId: id });
    }

    /**
     * Sets the banner of an existing owned list
     * @param listId 
     * @param mediaId 
     * @returns `true` on success
     */
    public async setListBanner(listId: string, mediaId: string) {
        if (mediaId) {
            return await this.fetch(ENDPOINTS.EditListBanner, { listId, mediaId });
        }

        return await this.fetch(ENDPOINTS.DeleteListBanner, { listId });
    }

    /**
     * Adds a user to a list
     * @param listId 
     * @param userId 
     * @returns `true` on success
     */
    public async listUser(listId: string, userId: string) {
        return await this.fetch(ENDPOINTS.ListAddMember, { listId, userId });
    }

    /**
     * Removes a user from a list
     * @param listId 
     * @param userId 
     * @returns `true` on success
     */
    public async unlistUser(listId: string, userId: string) {
        return await this.fetch(ENDPOINTS.ListRemoveMember, { listId, userId });
    }

    /**
     * Subscribes to a list
     * @param id 
     * @returns `true` on success
     */
    public async subscribeToList(id: string) {
        return await this.fetch(ENDPOINTS.ListSubscribe, { listId: id });
    }

    /**
     * Unsubscribes from a list
     * @param id 
     * @returns `true` on success
     */
    public async unsubscribeFromList(id: string) {
        return await this.fetch(ENDPOINTS.ListUnsubscribe, { listId: id });
    }

    /**
     * Adds a list as a pinned timeline
     * @param id 
     * @returns `true` on success
     */
    public async pinList(id: string) {
        return await this.fetch(ENDPOINTS.PinTimeline, { pinnedTimelineItem: { id, pinned_timeline_type: 'List' } });
    }

    /**
     * Removes a list as a pinned timeline
     * @param id 
     * @returns `true` on success
     */
    public async unpinList(id: string) {
        return await this.fetch(ENDPOINTS.UnpinTimeline, {
            pinnedTimelineItem: { id, pinned_timeline_type: 'List' }
        });
    }

    public async muteList(id: string) {
        return await this.fetch(ENDPOINTS.MuteList, { listId: id });
    }

    public async unmuteList(id: string) {
        return await this.fetch(ENDPOINTS.UnmuteList, { listId: id });
    }



    /**
     * Gets notifications
     * 
     * Arguments:
     * 
     * + `type?: 'All' | 'Verified' | 'Mentions' = 'All'` - Filter notifications?
     * + `cursor?: string`
     * 
     * @param args Arguments
     * @returns Slice of notifications
     */
    public async* getNotifications(args?: NotificationGetArgs): Timeline<Notification> {
        for await (const slice of this.getSlice(args, this.getNotificationsSlice)) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets notifications
     * 
     * Arguments:
     * 
     * + `type?: 'All' | 'Verified' | 'Mentions' = 'All'` - Filter notifications?
     * + `cursor?: string`
     * 
     * @param args Arguments
     * @returns Slice of notifications
     */
    public async getNotificationsSlice(args?: NotificationGetArgs) {
        return await this.fetch(ENDPOINTS.NotificationsTimeline, { timeline_type: args?.type || 'All', cursor: args?.cursor });
    }

    /**
     * Gets recent tweets from users you allowed notifications from, chronologically
     * @param args Cursor only
     * @returns Slice of tweets
     */
    public async* getNotifiedTweets(args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, this.getNotifiedTweetsSlice)) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets recent tweets from users you allowed notifications from, chronologically
     * @param args Cursor only
     * @returns Slice of tweets
     */
    public async getNotifiedTweetsSlice(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.device_follow, args);
    }

    /**
     * Adjust last seen cursor for notifications, which can be used to mark notifications as read
     * @param cursor 
     */
    public async lastSeenCursor(cursor: string) {
        return await this.fetch(ENDPOINTS.last_seen_cursor, { cursor });
    }

    /**
     * Gets unread notifications counter split between regular notifications and inbox (dms)
     * @returns Unread count
     */
    public async getUnreadCount() {
        return await this.fetch(ENDPOINTS.badge_count);
    }

    

    /**
     * Gets the tweets on your timeline.
     * Algorithmical timeline gets from the "For you" page;
     * chronological gets from following, starting from the most recent
     * 
     * Arguments:
     * 
     * + `type?: 'Algorithmical' | 'Chronological' | 'Generic' = 'Algorithmical'` - Type of timeline to fetch
     * + `id: string` - The id of the generic timeline (only if `type === 'Generic'`)
     * + `seenTweetIds?: string[] = []` - ids of already seen tweets
     * + `cursor?: string`
     * 
     * @param args Arguments
     * @yields Slice of timeline tweets
     */
    public async* getTimeline(args?: TimelineGetArgs): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, this.getTimelineSlice)) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets the tweets on your timeline.
     * Algorithmical timeline gets from the "For you" page;
     * chronological gets from following, starting from the most recent
     * 
     * Arguments:
     * 
     * + `type?: 'Algorithmical' | 'Chronological' | 'Generic' = 'Algorithmical'` - Type of timeline to fetch
     * + `id: string` - The id of the generic timeline (only if `type === 'Generic'`)
     * + `seenTweetIds?: string[] = []` - ids of already seen tweets
     * + `cursor?: string`
     * 
     * @param args Arguments
     * @returns Slice of timeline tweets
     */
    public async getTimelineSlice(args?: TimelineGetArgs) {
        if (args?.type === 'Generic') {
            return await this.fetch(ENDPOINTS.GenericTimelineById, { timelineId: args.id, cursor: args.cursor });
        }

        const seenTweetIds = args?.seenTweetIds ?? [];
        const requestContext = args?.cursor ? undefined : 'launch';

        if (args?.type === 'Chronological') {
            return await this.fetch(ENDPOINTS.HomeLatestTimeline, { seenTweetIds, requestContext, cursor: args.cursor });
        }

        return await this.fetch(ENDPOINTS.HomeTimeline, { seenTweetIds, requestContext, cursor: args?.cursor });
    }

    /**
     * Performs a standard Twitter search.
     * All advanced search features can be used like normal, and `QueryBuilder` can be used for complex searches
     * 
     * Arguments:
     * 
     * + `type?: 'Algorithmical' | 'Chronological' | 'Media' | 'Users' | 'Lists' = 'Algorithmical` - Type of data to search through. `'media'` will have the same effect as putting `filter:media` in the query
     * + `cursor?: string`
     * 
     * @param query Query as string or using QueryBuilder
     * @param args Arguments
     * @yields Slice of tweets, users, or lists depending on `type`
     * @see `utils/types/querybuilder.ts/QueryBuilder`
     */
    public async* search(query: string | QueryBuilder, args?: SearchArgs): Timeline<TweetKind | UserKind | ListKind> {
        for await (const slice of this.getSlice(args, args => this.searchSlice(query, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Performs a standard Twitter search.
     * All advanced search features can be used like normal, and `QueryBuilder` can be used for complex searches
     * 
     * Arguments:
     * 
     * + `type?: 'Algorithmical' | 'Chronological' | 'Media' | 'Users' | 'Lists' = 'Algorithmical` - Type of data to search through. `'media'` will have the same effect as putting `filter:media` in the query
     * + `cursor?: string`
     * 
     * @param query Query as string or using QueryBuilder
     * @param args Arguments
     * @returns Slice of tweets, users, or lists depending on `type`
     * @see `utils/types/querybuilder.ts/QueryBuilder`
     */
    public async searchSlice(query: string | QueryBuilder, args?: SearchArgs) {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: typeof query === 'string' ? query : query.toString(), querySource: 'typed_query', product: 'Top', cursor: args?.cursor });
    }

    /**
     * Gets matching users and topics to display in the search bar while typing
     * @param query 
     * @returns Typeahead
     */
    public async typeahead(query: string) {
        return await this.fetch(ENDPOINTS.search_typeahead, { q: query });
    }



    /**
     * Creates a new tweet
     * 
     * Arguments
     * 
     * + `text?: string` - Body of the tweet (up to 280 characters)
     * + `replyTo: string` - id of another tweet to send this tweet as a reply to
     * + `mediaIds?: string[]` - Up to 4 media ids to send with the tweet as attached images/videos
     * + `sensitive?: boolean = false` - Mark tweet as sensitive?
     * + `replyPermission?: TweetReplyPermission` - Limit replies to a certain group
     * 
     * @param args Arguments
     * @param thread Additional tweets to reply to the root tweet with (may be slow, as Twitter doesn't offer a built-in solution for this, so each request is made individually)
     * @returns Created tweet
     */
    public async createTweet(args: TweetCreateArgs, thread?: ThreadTweetArgs[]): Promise<TwitterResponse<Tweet>> {
        const text = args.text || '';

        if (text.length > TWEET_CHARACTER_LIMIT && this.#options.longTweetBehavior === 'Fail') {
            return {
                errors: [{
                    code: -1,
                    message: 'Tweet exceeded character limit'
                }]
            };
        }

        const mode = args.replyPermission === 'Following'
            ? 'Community'
        : args.replyPermission === 'Verified'
            ? 'Verified'
        : args.replyPermission === 'Mentioned'
            ? 'ByInvitation'
            : undefined;

        if (text.length > TWEET_CHARACTER_LIMIT && (this.#options.longTweetBehavior === 'NoteTweet' || this.#options.longTweetBehavior === 'NoteTweetUnchecked')) {
            return {
                errors: [{
                    code: -1,
                    message: 'Unimplemented'
                }]
            };
        }

        const { errors, data: tweet } = await this.fetch(ENDPOINTS.CreateTweet, {
            batch_compose: !!thread?.length && !args.replyTo ? 'BatchFirst' : undefined,
            conversation_control: mode ? { mode } : undefined,
            media: {
                media_entities: args.mediaIds?.map(id => ({
                    media_id: id,
                    tagged_users: []
                })) || [],
                possibly_sensitive: !!args.sensitive
            },
            reply: args.replyTo ? {
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

    /** @deprecated Use the `createTweet` method instead */
    tweet = this.createTweet;

    /**
     * Deletes an owned tweet
     * @param id 
     * @returns `true` on success
     */
    public async deleteTweet(id: string) {
        return await this.fetch(ENDPOINTS.DeleteTweet, { tweet_id: id });
    }

    /**
     * Creates a schedules tweet.
     * Scheduled tweets can't have custom reply permissions or thread tweets
     * 
     * Arguments:
     * 
     * + `sendAt: Date | number` - Date to publish the tweet at (`number` should use the `getTime` method on `Date`)
     * + `text?: string` - Body of the tweet (up to 280 characters)
     * + `mediaIds?: string[]` - Up to 4 media ids to send with the tweet as attached images/videos
     * 
     * @param args Arguments
     * @returns 
     */
    public async createScheduledTweet(args: ScheduledTweetCreateArgs) {
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

    public async editScheduledTweet(id: string, args: ScheduledTweetCreateArgs) {
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

    public async getScheduledTweets(args?: UnsentTweetsGetArgs) {
        return await this.fetch(ENDPOINTS.FetchScheduledTweets, { ascending: !!args?.ascending });
    }

    /**
     * Gets a tweet and its replies
     * 
     * Arguments:
     * 
     * + `sort?: 'Relevant' | 'Recent' | 'Likes' = 'Relevant'` - Sort replies by?
     * + `cursor?: string`
     * 
     * @param id 
     * @param args Arguments
     * @yields Slice of tweets
     */
    public async* getTweet(id: string, args?: TweetGetArgs): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getTweetSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets a tweet and its replies
     * 
     * Arguments:
     * 
     * + `sort?: 'Relevant' | 'Recent' | 'Likes' = 'Relevant'` - Sort replies by?
     * + `cursor?: string`
     * 
     * @param id 
     * @param args Arguments
     * @returns Slice of tweets
     */
    public async getTweetSlice(id: string, args?: TweetGetArgs) {
        const rankingMode = args?.sort === 'Recent'
            ? 'Recency'
        : args?.sort === 'Likes'
            ? 'Likes'
            : 'Relevance';

        return await this.fetch(ENDPOINTS.TweetDetail, { focalTweetId: id, rankingMode, cursor: args?.cursor });
    }

    /**
     * Gets a tweet by its id, without replies
     * @param id 
     * @returns Tweet
     */
    public async getTweetResult(id: string) {
        return await this.fetch(ENDPOINTS.TweetResultByRestId, { tweetId: id });
    }

    /**
     * Gets tweets by their ids, without replies
     * @param ids 
     * @returns Array of tweets
     */
    public async getTweetResults(ids: [string, ...string[]]) {
        return await this.fetch(ENDPOINTS.TweetResultsByRestIds, { tweetIds: ids });
    }

    /**
     * Gets hidden replies on a tweet
     * @param tweetId 
     * @param args Cursor only
     * @yields Slice of tweets
     */
    public async* getHiddenReplies(tweetId: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getHiddenRepliesSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets hidden replies on a tweet
     * @param tweetId 
     * @param args Cursor only
     * @returns Slice of tweets
     */
    public async getHiddenRepliesSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ModeratedTimeline, { rootTweetId: tweetId, ...args });
    }

    /**
     * Gets users who liked a tweet
     * 
     * In ~June 2024, liked tweet were made private, so this method will return an empty array if the tweet wasn't made by you
     * 
     * @param tweetId 
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getLikes(tweetId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getLikesSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets users who liked a tweet
     * 
     * In ~June 2024, liked tweet were made private, so this method will return an empty array if the tweet wasn't made by you
     * 
     * @param tweetId 
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getLikesSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Favoriters, { tweetId: tweetId, ...args });
    }

    /**
     * Gets users who retweeted a tweet
     * @param tweetId 
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getRetweets(tweetId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getRetweetsSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets users who retweeted a tweet
     * @param tweetId 
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getRetweetsSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Retweeters, { tweetId: tweetId, ...args });
    }

    /**
     * Gets quote tweets to a tweet
     * 
     * Equivalent to searching for query 
     * 
     * @param tweetId 
     * @param args Cursor only
     * @yields Slice of tweets
     */
    public async* getQuoteTweets(tweetId: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getQuoteTweetsSlice(tweetId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets quote tweets to a tweet
     * 
     * Equivalent to searching for query 
     * 
     * @param tweetId 
     * @param args Cursor only
     * @returns Slice of tweets
     */
    public async getQuoteTweetsSlice(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: `quoted_tweet_id:${tweetId}`, querySource: 'tdqt', product: 'Top', ...args }) as TwitterResponse<Slice<TweetKind>>;
    }

    /** @deprecated typo, use `getQuotedTweets` instead */
    getQuotedTweets = this.getQuoteTweets;

    /**
     * Bookmark a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    public async bookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateBookmark, { tweet_id: tweetId });
    }

    /**
     * Unbookmark a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    public async unbookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteBookmark, { tweet_id: tweetId });
    }

    /**
     * Like a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    public async like(tweetId: string) {
        return await this.fetch(ENDPOINTS.FavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Unlike a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    public async unlike(tweetId: string) {
        return await this.fetch(ENDPOINTS.UnfavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Retweet a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    public async retweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateRetweet, { tweet_id: tweetId });
    }

    /**
     * Unretweet a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    public async unretweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteRetweet, { source_tweet_id: tweetId });
    }

    /**
     * Hide a reply on a tweet. It will still be visible in hidden replies
     * @param id 
     * @returns `true` on success
     */
    public async hideTweet(id: string) {
        return await this.fetch(ENDPOINTS.ModerateTweet, { tweetId: id });
    }

    /**
     * Unhide a hidden reply
     * @param id 
     * @returns `true` on success
     */
    public async unhideTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnmoderateTweet, { tweetId: id });
    }

    /**
     * Set a tweet as your pinned tweet
     * @param id 
     * @returns `true` on success
     */
    public async pinTweet(id: string) {
        return await this.fetch(ENDPOINTS.PinTweet, { tweet_id: id });
    }

    /**
     * Remove your pinned tweet
     * @param id Your current pinned tweet id
     * @returns `true` on success
     */
    public async unpinTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnpinTweet, { tweet_id: id });
    }

    /**
     * Changes who can reply to an owned tweet
     * @param tweetId 
     * @param permission Reply permission, or `undefined` to allow everyone to reply
     * @returns `true` on success
     */
    public async changeReplyPermission(tweetId: string, permission?: TweetReplyPermission) {
        if (!permission || permission === 'None') {
            return await this.fetch(ENDPOINTS.ConversationControlDelete, { tweet_id: tweetId });
        }

        const mode = permission === 'Following'
            ? 'Community'
        : permission === 'Verified'
            ? 'Verified'
            : 'ByInvitation';

        return await this.fetch(ENDPOINTS.ConversationControlChange, { tweet_id: tweetId, mode });
    }

    /**
     * Removes you from a conversation and turn "\@username" links to your profile into regular text
     * @param id Tweet id
     * @returns `true` on success
     */
    public async unmention(id: string) {
        return await this.fetch(ENDPOINTS.UnmentionUserFromConversation, { tweet_id: id });
    }

    /**
     * Mutes a tweet, preventing you from getting notifications relating to it
     * @param id 
     * @returns `true` on success
     */
    public async muteTweet(id: string) {
        return await this.fetch(ENDPOINTS.mutes_conversations_create, { tweet_id: id });
    }

    /**
     * Unmutes a tweet
     * @param id 
     * @returns `true` on success
     */
    public async unmuteTweet(id: string) {
        return await this.fetch(ENDPOINTS.mutes_conversations_destroy, { tweet_id: id });
    }



    /**
     * Gets a user by their id or \@username
     * 
     * @param id id or \@username
     * @param args By username?
     * @returns User
     */
    public async getUser(id: string, args?: ByUsername) {
        const { errors, data: user } = await (args?.byUsername
            ? this.fetch(ENDPOINTS.UserByScreenName, { screen_name: id })
            : this.fetch(ENDPOINTS.UserByRestId, { userId: id })
        );
        
        if (errors.length > 0) {
            return { errors, data: user };
        }

        if (user?.__typename === 'User' && (this.twid === user.id || this.self?.username === user.username)) {
            this.self = user;
        }

        return { errors, data: user };
    }

    /**
     * Gets multiple users by their id or \@username
     * @param ids ids or \@usernames
     * @param args By username?
     * @returns Users
     */
    public async getUsers(ids: [string, ...string[]], args?: ByUsername) {
        if (args?.byUsername) {
            return await this.fetch(ENDPOINTS.UsersByScreenNames, { screen_names: ids });
        }

        return await this.fetch(ENDPOINTS.UsersByRestIds, { userIds: ids });
    }

    /**
     * Gets tweets from a user chronologically
     * 
     * Arguments:
     * 
     * + `replies?: boolean = false` - Include replies?
     * + `cursor?: string`
     * 
     * @param id User id
     * @param args Arguments
     * @yields Slice of user tweets
     */
    public async* getUserTweets(id: string, args?: UserTweetsGetArgs): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets tweets from a user chronologically
     * 
     * Arguments:
     * 
     * + `replies?: boolean = false` - Include replies?
     * + `cursor?: string`
     * 
     * @param id User id
     * @param args Arguments
     * @returns Slice of user tweets
     */
    public async getUserTweetsSlice(id: string, args?: UserTweetsGetArgs) {
        if (args?.replies) {
            return await this.fetch(ENDPOINTS.UserTweetsAndReplies, { userId: id, cursor: args.cursor });
        }

        return await this.fetch(ENDPOINTS.UserTweets, { userId: id, cursor: args?.cursor });
    }

    /**
     * Gets tweets and replies from a user chronologically
     * @param id User id
     * @param args Cursor only
     * @returns Slice of user tweets
     * @deprecated Combined with `getUserTweets`, with the `replies` argument
     */
    public async getUserRepliesSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserTweetsAndReplies, { userId: id, ...args });
    }

    /**
     * Gets media tweets from a user chronologically
     * @param id User id
     * @param args Cursor only
     * @yields Slice of user media tweets
     */
    public async* getUserMedia(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserMediaSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets media tweets from a user chronologically
     * @param id User id
     * @param args Cursor only
     * @returns Slice of user media tweets
     */
    public async getUserMediaSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserMedia, { userId: id, ...args });
    }

    /**
     * Gets liked tweets of a user chronologically (ordered by the time when each tweet was liked)
     * 
     * In ~June 2024, liked tweet were made private, so this method will return an empty array if used on any user other than the current one
     * 
     * @param id User id
     * @param args Cursor only
     * @yields Slice of tweets
     */
    public async* getUserLikes(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserLikesSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets liked tweets of a user chronologically (ordered by the time when each tweet was liked)
     * 
     * In ~June 2024, liked tweet were made private, so this method will return an empty array if used on any user other than the current one
     * 
     * @param id User id
     * @param args Cursor only
     * @returns Slice of tweets
     */
    public async getUserLikesSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Likes, { userId: id, ...args });
    }

    /**
     * Gets highlighted tweets from a user. This feature is only available to verified users
     * @param id User id
     * @param args Cursor only
     * @yields Slice of tweets
     */
    public async* getUserHighlightedTweets(id: string, args?: CursorOnly): Timeline<TweetKind> {
        for await (const slice of this.getSlice(args, args => this.getUserHighlightedTweetsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets highlighted tweets from a user. This feature is only available to verified users
     * @param id User id
     * @param args Cursor only
     * @returns Slice of tweets
     */
    public async getUserHighlightedTweetsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserHighlightsTweets, { userId: id, ...args });
    }

    /**
     * Gets followed users of a user
     * @param userId 
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getFollowing(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getFollowingSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets followed users of a user
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getFollowingSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Following, { userId: userId, ...args });
    }

    /**
     * Gets followers of a user
     * @param userId 
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getFollowers(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getFollowingSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets followers of a user
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getFollowersSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Followers, { userId: userId, ...args });
    }

    /**
     * Gets followers of a user that you also follow
     * @param userId 
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getFollowersYouKnow(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getFollowingSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets followers of a user that you also follow
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getFollowersYouKnowSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.FollowersYouKnow, { userId: userId, ...args });
    }

    /**
     * Gets verified followers of a user
     * @param userId 
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getVerifiedFollowers(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getVerifiedFollowersSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets verified followers of a user
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getVerifiedFollowersSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BlueVerifiedFollowers, { userId: userId, ...args });
    }

    /**
     * Gets super followed users of a user
     * 
     * Super follows can be private, so this method may not work consistently
     * 
     * @param userId 
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getSuperFollowing(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getSuperFollowingSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets super followed users of a user
     * 
     * Super follows can be private, so this method may not work consistently
     * 
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getSuperFollowingSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserCreatorSubscriptions, { userId: userId, ...args });
    }

    /**
     * Gets affiliates of a business account
     * @param userId Business account user id
     * @param args Cursor only
     * @yields Slice of users
     */
    public async* getAffiliates(userId: string, args?: CursorOnly): Timeline<UserKind> {
        for await (const slice of this.getSlice(args, args => this.getAffiliatesSlice(userId, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets affiliates of a business account
     * @param userId Business account user id
     * @param args Cursor only
     * @returns Slice of users
     */
    public async getAffiliatesSlice(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserBusinessProfileTeamTimeline, { userId: userId, teamName: 'NotAssigned', ...args });
    }

    /**
     * Gets lists created by a user
     * @param id User id
     * @param args Cursor only
     * @yields Slice of lists
     */
    public async* getUserLists(id: string, args?: CursorOnly): Timeline<ListKind> {
        for await (const slice of this.getSlice(args, args => this.getUserListsSlice(id, args))) yield slice;
        return EMPTY_SLICE;
    }

    /**
     * Gets lists created by a user
     * @param id User id
     * @param args Cursor only
     * @returns Slice of lists
     */
    public async getUserListsSlice(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CombinedLists, { userId: id, ...args });
    }

    /**
     * Follows a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    public async followUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unfollows a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    public async unfollowUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Enables retweets from a followed user to show up on your timeline
     * @param userId 
     * @returns `true` on success
     */
    public async enableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: true });
    }

    /**
     * Disables retweets from a followed user from showing up on your timeline
     * @param userId 
     * @returns `true` on success
     */
    public async disableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: false });
    }

    /**
     * Enables receiveing tweet notifications from a user
     * @param userId 
     * @returns `true` on success
     */
    public async enableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: true });
    }

    /**
     * Disables receiveing tweet notifications from a user
     * @param userId 
     * @returns `true` on success
     */
    public async disableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: false });
    }

    /**
     * Gets incoming follow requests
     * @param args Cursor only
     * @returns User ids
     */
    public async getFollowRequests(args: CursorOnly) {
        return await this.fetch(ENDPOINTS.friendships_incoming, { cursor: Number(args?.cursor || '-1') });
    }

    /**
     * Cancel an outgoing follow request to a user
     * @param userId 
     * @param args By username?
     * @returns `true` on success
     */
    public async cancelFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_cancel, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Accept an incoming follow request from a user
     * @param userId 
     * @param args By username?
     * @returns `true` on success
     */
    public async acceptFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_accept, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Decline an incoming follow request from a user
     * @param userId 
     * @param args By username?
     * @returns `true` on success
     */
    public async declineFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_deny, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Blocks a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    public async blockUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.blocks_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unblocks a user - for some reason this method randomly returns a 404 whenever it wants and i have no idea why
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    public async unblockUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.blocks_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Mutes a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    public async muteUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.mutes_users_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unmutes a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    public async unmuteUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.mutes_users_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Sends several requests to upload a media file
     * 
     * Arguments:
     * 
     * + `contentType: string` - Mime type of the uploaded media
     * + `altText?: string` - If set, calls `this.addAltText` to immediately add ALT text to the media
     * + `segmentSizeOverride?: number` - Overrides the default segments size
     * 
     * @param media The file as `ArrayBuffer`
     * @param args Arguments
     * @param callback Function called after each chunk is uploaded
     * @returns Information about the uploaded file
     */
    public async upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void): Promise<TwitterResponse<Media>> {
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
                dispatcher: this.getAgent()
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
                errors: [{
                    code: -1,
                    message: String(error)
                }]
            };
        }
    }

    /**
     * Check the current status of an uploaded media file
     * @param id Media id
     * @returns Information about the uploaded file
     */
    public async mediaStatus(id: string) {
        return await this.fetch(ENDPOINTS.media_upload_STATUS);
    }

    /**
     * Adds ALT text to an uploaded media
     * @param id 
     * @param text 
     * @returns `true` on success
     */
    public async addAltText(id: string, text: string) {
        return await this.fetch(ENDPOINTS.media_metadata_create, {
            allow_download_status: { allow_download: 'true' },
            alt_text: { text },
            media_id: id
        });
    }
}
