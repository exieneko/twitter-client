import { ENDPOINTS, HEADERS, PUBLIC_TOKEN } from './consts.js';
import { mediaUpload } from './formatter/tweet.js';
import type { Media, MediaUploadInit, TweetKind, Tweet, TweetTombstone, Slice } from './types/index.js';
import { gql, toSearchParams } from './utils/index.js';
import type { BirdwatchRateNoteArgs, BlockedAccountsGetArgs, ByUsername, CommunityTimelineGetArgs, CursorOnly, Endpoint, BySlug, ListCreateArgs, MediaUploadArgs, NotificationGetArgs, Params, ScheduledTweetCreateArgs, SearchArgs, ThreadTweetArgs, TimelineGetArgs, Tokens, TweetCreateArgs, TweetGetArgs, TweetReplyPermission, TwitterResponse, UnsentTweetsGetArgs, UpdateProfileArgs } from './utils/types/index.js';
import { QueryBuilder } from './utils/types/querybuilder.js';

export class TwitterClient {
    #tokens: Tokens;

    constructor(tokens: Tokens) {
        this.#tokens = tokens;
    }

    private headers(token?: string, type: 'gql' | 'v1.1' | 'fd' = 'gql'): Record<string, string> {
        function tokenHeaders(tokens: Tokens) {
            return {
                'x-csrf-token': tokens.csrf,
                cookie: `auth_token=${tokens.authToken}; ct0=${tokens.csrf}; lang=en`
            };
        }

        return type === 'fd' ? {
            ...HEADERS,
            authorization: token || PUBLIC_TOKEN,
            ...tokenHeaders(this.#tokens)
        } : {
            ...HEADERS,
            authorization: token || PUBLIC_TOKEN,
            'content-type': `${type === 'gql' ? 'application/json' : 'application/x-www-form-urlencoded'}; charset=utf-8`,
            ...tokenHeaders(this.#tokens)
        };
    }

    private async fetch<T extends Endpoint>(endpoint: T, params?: Params<T>): Promise<TwitterResponse<ReturnType<T['parser']>>> {
        const isGql = !endpoint.url.startsWith('https');

        const headers = this.headers(endpoint.token, isGql ? 'gql' : 'v1.1');

        let data: Parameters<Endpoint['parser']>[0] | null = null;

        try {
            const body = new URLSearchParams({ ...endpoint.variables, ...params }).toString();
            const response = await (isGql
                ? (endpoint.method === 'get'
                    ? fetch(gql(endpoint.url) + toSearchParams({ variables: { ...endpoint.variables, ...params }, features: endpoint.features }), {
                        method: endpoint.method,
                        headers
                    })
                    : fetch(gql(endpoint.url), {
                        method: endpoint.method,
                        headers,
                        body: JSON.stringify({
                            variables: { ...endpoint.variables, ...params },
                            features: endpoint.features,
                            queryId: endpoint.url.split('/', 1)[0]
                        })
                    })
                )
                : fetch(endpoint.method === 'get' && body ? `${endpoint.url}?${body}` : endpoint.url, {
                    method: endpoint.method,
                    headers,
                    body: endpoint.method === 'post' && body ? body : undefined
                })
            );

            data = await response.json();
        } catch (error: any) {
            return {
                errors: [{
                    code: -1,
                    message: String(error.stack)
                }]
            };
        }

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
    async getBlockedAccounts(args?: BlockedAccountsGetArgs) {
        if (args?.imported) {
            return await this.fetch(ENDPOINTS.BlockedAccountsImported, { cursor: args?.cursor });
        }

        return await this.fetch(ENDPOINTS.BlockedAccountsAll, { cursor: args?.cursor });
    }

    /**
     * Get muted accounts* 
     * @param args Cursor only
     * @returns Slice of muted accounts
     */
    async getMutedAccounts(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.MutedAccounts, args);
    }

    /**
     * Gets account settings
     * @returns Settings
     */
    async getSettings() {
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
    async updateProfile(args: UpdateProfileArgs) {
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
    async setAvatar(mediaId: string) {
        return await this.fetch(ENDPOINTS.account_update_profile_image, { media_id: mediaId });
    }

    /**
     * Gets the currently logged-in user based only on their tokens
     * @returns User
     */
    async verifyCredentials() {
        return await this.fetch(ENDPOINTS.account_verify_credentials);
    }



    /**
     * Gets all Birdwatch notes on a given tweet
     * @param id Tweet id
     * @returns All NN and NNN notes on a tweet
     */
    async getBirdwatchNotesOnTweet(id: string) {
        return await this.fetch(ENDPOINTS.BirdwatchFetchNotes, { tweet_id: id });
    }

    /**
     * Gets a Birdwatch contributor based on their alias
     * @param alias 
     * @returns Birdwatch user
     */
    async getBirdwatchUser(alias: string) {
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
    async rateBirdwatchNote(noteId: string, args: BirdwatchRateNoteArgs) {
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
    async unrateBirdwatchNote(noteId: string) {
        return await this.fetch(ENDPOINTS.BirdwatchDeleteRating, { note_id: noteId });
    }



    /**
     * Gets bookmarks
     * @param args Cursor only
     * @returns Slice of bookmarked tweets
     */
    async getBookmarks(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Bookmarks, args);
    }

    /**
     * Searches through bookmarked tweets
     * @param query 
     * @param args Cursor only
     * @returns Slice of bookmarked tweets
     */
    async searchBookmarks(query: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BookmarkSearchTimeline, { rawQuery: query, ...args });
    }

    /**
     * Clears bookmarked status on all tweets
     * @returns `true` on success
     */
    async clearBookmarks() {
        return await this.fetch(ENDPOINTS.BookmarksAllDelete);
    }



    /**
     * Gets a Twitter community by its id
     * @param id 
     * @returns Community
     */
    async getCommunity(id: string) {
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
     * @returns Slice of tweets
     */
    async getCommunityTweets(id: string, args?: CommunityTimelineGetArgs) {
        const rankingMode = args?.sort === 'Recent' ? 'Recency' : 'Relevance';
        return await this.fetch(ENDPOINTS.CommunityTweetsTimeline, { communityId: id, rankingMode, ...args });
    }

    /**
     * Gets tweets containing media in a given community
     * @param id Community id
     * @param args Cursor only
     * @returns Slice of media tweets
     */
    async getCommunityMedia(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CommunityMediaTimeline, { communityId: id, ...args });
    }

    /**
     * Joins a community
     * @param id Community id
     * @returns `true` on success
     */
    async joinCommunity(id: string) {
        return await this.fetch(ENDPOINTS.JoinCommunity, { communityId: id });
    }

    /**
     * Leaves a community
     * @param id Community id
     * @returns `true` on success
     */
    async leaveCommunity(id: string) {
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
    async getList(id: string, args?: BySlug) {
        if (args?.bySlug) {
            return await this.fetch(ENDPOINTS.ListBySlug, { listId: id });
        }

        return await this.fetch(ENDPOINTS.ListByRestId, { listId: id });
    }

    /**
     * Gets tweets by users on a given list
     * @param id 
     * @param args Cursor only
     * @returns Slice of tweets
     */
    async getListTweets(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListLatestTweetsTimeline, { listId: id, ...args });
    }

    /**
     * Gets list discovery page
     * @returns Slice of lists
     */
    async getListDiscovery() {
        return await this.fetch(ENDPOINTS.ListsDiscovery);
    }

    /**
     * Gets lists you're a member of
     * @param args Cursor only
     * @returns Slice of lists
     */
    async listedOn(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMemberships, args);
    }

    async getOwnedLists(userId: string, otherUserId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListOwnerships, { userId, isListMemberTargetUserId: otherUserId, ...args });
    }

    /**
     * Gets members of a list
     * @param id 
     * @param args Cursor only
     * @returns Slice of users on list
     */
    async getListMembers(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ListMembers, { listId: id, ...args });
    }

    /**
     * Gets subscribers of a list
     * @param id 
     * @param args Cursor only
     * @returns Slice of users subscribed to the list
     */
    async getListSubscribers(id: string, args?: CursorOnly) {
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
    async createList(args: ListCreateArgs) {
        return await this.fetch(ENDPOINTS.CreateList, { description: args.description || '', isPrivate: !!args.private, ...args });
    }

    /**
     * Edits an existing owned list
     * @param id 
     * @param args Arguments are same as list creation, but required
     * @returns `true` on success
     */
    async editList(id: string, args: Required<ListCreateArgs>) {
        return await this.fetch(ENDPOINTS.UpdateList, { listId: id, isPrivate: args.private, ...args });
    }

    /**
     * Deletes an existing owned list
     * @param id 
     * @returns `true` on success
     */
    async deleteList(id: string) {
        return await this.fetch(ENDPOINTS.DeleteList, { listId: id });
    }

    /**
     * Sets the banner of an existing owned list
     * @param listId 
     * @param mediaId 
     * @returns `true` on success
     */
    async setListBanner(listId: string, mediaId: string) {
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
    async listUser(listId: string, userId: string) {
        return await this.fetch(ENDPOINTS.ListAddMember, { listId, userId });
    }

    /**
     * Removes a user from a list
     * @param listId 
     * @param userId 
     * @returns `true` on success
     */
    async unlistUser(listId: string, userId: string) {
        return await this.fetch(ENDPOINTS.ListRemoveMember, { listId, userId });
    }

    /**
     * Subscribes to a list
     * @param id 
     * @returns `true` on success
     */
    async subscribeToList(id: string) {
        return await this.fetch(ENDPOINTS.ListSubscribe, { listId: id });
    }

    /**
     * Unsubscribes from a list
     * @param id 
     * @returns `true` on success
     */
    async unsubscribeFromList(id: string) {
        return await this.fetch(ENDPOINTS.ListUnsubscribe, { listId: id });
    }

    /**
     * Adds a list as a pinned timeline
     * @param id 
     * @returns `true` on success
     */
    async pinList(id: string) {
        return await this.fetch(ENDPOINTS.PinTimeline, { pinnedTimelineItem: { id, pinned_timeline_type: 'List' } });
    }

    /**
     * Removes a list as a pinned timeline
     * @param id 
     * @returns `true` on success
     */
    async unpinList(id: string) {
        return await this.fetch(ENDPOINTS.UnpinTimeline, {
            pinnedTimelineItem: { id, pinned_timeline_type: 'List' }
        });
    }

    async muteList(id: string) {
        return await this.fetch(ENDPOINTS.MuteList, { listId: id });
    }

    async unmuteList(id: string) {
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
    async getNotifications(args?: NotificationGetArgs) {
        return await this.fetch(ENDPOINTS.NotificationsTimeline, { timeline_type: args?.type || 'All', ...args });
    }

    /**
     * Gets recent tweets from users you allowed notifications from, chronologically
     * @param args Cursor only
     * @returns Slice of tweets
     */
    async getNotifiedTweets(args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.device_follow, args);
    }

    /**
     * Adjust last seen cursor for notifications, which can be used to mark notifications as read
     * @param cursor 
     */
    async lastSeenCursor(cursor: string) {
        return await this.fetch(ENDPOINTS.last_seen_cursor, { cursor });
    }

    /**
     * Gets unread notifications counter split between regular notifications and inbox (dms)
     * @returns Unread count
     */
    async getUnreadCount() {
        return await this.fetch(ENDPOINTS.badge_count);
    }

    

    /**
     * Gets the tweets on your timeline.
     * Algorithmical timeline gets from the "For you" page;
     * chronological gets from following, starting from the most recent
     * 
     * Arguments:
     * 
     * + `type?: 'Algorithmical' | 'Chronological' = 'Algorithmical'` - Type of timeline to fetch
     * + `seenTweetIds?: string[] = []` - ids of already seen tweets
     * + `cursor?: string`
     * 
     * @param args Arguments
     * @returns Slice of timeline tweets
     */
    async getTimeline(args?: TimelineGetArgs) {
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
     * @returns Slice of tweets, users, or lists depending on 
     * @see `utils/types/querybuilder.ts/QueryBuilder`
     */
    async search(query: string | QueryBuilder, args?: SearchArgs) {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: typeof query === 'string' ? query : query.toString(), querySource: 'typed_query', product: 'Top', cursor: args?.cursor });
    }

    /**
     * Gets matching users and topics to display in the search bar while typing
     * @param query 
     * @returns Typeahead
     */
    async typeahead(query: string) {
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
    async createTweet(args: TweetCreateArgs, thread?: ThreadTweetArgs[]): Promise<TwitterResponse<Tweet | TweetTombstone>> {
        const mode = args.replyPermission === 'Following'
            ? 'Community'
        : args.replyPermission === 'Verified'
            ? 'Verified'
        : args.replyPermission === 'Mentioned'
            ? 'ByInvitation'
            : undefined;

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
            tweet_text: args.text || ''
        });

        if (tweet?.__typename === 'TweetTombstone') {
            return { errors, data: tweet };
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

            if (!data || data.__typename === 'TweetTombstone') {
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
    async deleteTweet(id: string) {
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
    async getTweet(id: string, args?: TweetGetArgs) {
        const rankingMode = args?.sort === 'Recent'
            ? 'Recency'
        : args?.sort === 'Likes'
            ? 'Likes'
            : 'Relevance';

        return await this.fetch(ENDPOINTS.TweetDetail, { focalTweetId: id, rankingMode, ...args });
    }

    /**
     * Gets a tweet by its id, without replies
     * @param id 
     * @returns Tweet
     */
    async getTweetResult(id: string) {
        return await this.fetch(ENDPOINTS.TweetResultByRestId, { tweetId: id });
    }

    /**
     * Gets tweets by their ids, without replies
     * @param ids 
     * @returns Array of tweets
     */
    async getTweetResults(ids: [string, ...string[]]) {
        return await this.fetch(ENDPOINTS.TweetResultsByRestIds, { tweetIds: ids });
    }

    /**
     * Gets hidden replies on a tweet
     * @param tweetId 
     * @param args Cursor only
     * @returns Slice of tweets
     */
    async getHiddenReplies(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.ModeratedTimeline, { rootTweetId: tweetId, ...args });
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
    async getLikes(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Favoriters, { tweetId: tweetId, ...args });
    }

    /**
     * Gets users who retweeted a tweet
     * @param tweetId 
     * @param args Cursor only
     * @returns Slice of users
     */
    async getRetweets(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Retweeters, { tweetId: tweetId, ...args });
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
    async getQuoteTweets(tweetId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.SearchTimeline, { rawQuery: `quoted_tweet_id:${tweetId}`, querySource: 'tdqt', product: 'Top', ...args }) as TwitterResponse<Slice<TweetKind>>;
    }

    /** @deprecated typo, use `getQuotedTweets` instead */
    getQuotedTweets = this.getQuoteTweets;

    /**
     * Bookmark a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    async bookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateBookmark, { tweet_id: tweetId });
    }

    /**
     * Unbookmark a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    async unbookmark(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteBookmark, { tweet_id: tweetId });
    }

    /**
     * Like a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    async like(tweetId: string) {
        return await this.fetch(ENDPOINTS.FavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Unlike a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    async unlike(tweetId: string) {
        return await this.fetch(ENDPOINTS.UnfavoriteTweet, { tweet_id: tweetId });
    }

    /**
     * Retweet a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    async retweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.CreateRetweet, { tweet_id: tweetId });
    }

    /**
     * Unretweet a tweet
     * @param tweetId 
     * @returns `true` on success
     */
    async unretweet(tweetId: string) {
        return await this.fetch(ENDPOINTS.DeleteRetweet, { source_tweet_id: tweetId });
    }

    /**
     * Hide a reply on a tweet. It will still be visible in hidden replies
     * @param id 
     * @returns `true` on success
     */
    async hideTweet(id: string) {
        return await this.fetch(ENDPOINTS.ModerateTweet, { tweetId: id });
    }

    /**
     * Unhide a hidden reply
     * @param id 
     * @returns `true` on success
     */
    async unhideTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnmoderateTweet, { tweetId: id });
    }

    /**
     * Set a tweet as your pinned tweet
     * @param id 
     * @returns `true` on success
     */
    async pinTweet(id: string) {
        return await this.fetch(ENDPOINTS.PinTweet, { tweet_id: id });
    }

    /**
     * Remove your pinned tweet
     * @param id Your current pinned tweet id
     * @returns `true` on success
     */
    async unpinTweet(id: string) {
        return await this.fetch(ENDPOINTS.UnpinTweet, { tweet_id: id });
    }

    /**
     * Changes who can reply to an owned tweet
     * @param tweetId 
     * @param permission Reply permission, or `undefined` to allow everyone to reply
     * @returns `true` on success
     */
    async changeReplyPermission(tweetId: string, permission?: TweetReplyPermission) {
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
    async unmention(id: string) {
        return await this.fetch(ENDPOINTS.UnmentionUserFromConversation, { tweet_id: id });
    }

    /**
     * Mutes a tweet, preventing you from getting notifications relating to it
     * @param id 
     * @returns `true` on success
     */
    async muteTweet(id: string) {
        return await this.fetch(ENDPOINTS.mutes_conversations_create, { tweet_id: id });
    }

    /**
     * Unmutes a tweet
     * @param id 
     * @returns `true` on success
     */
    async unmuteTweet(id: string) {
        return await this.fetch(ENDPOINTS.mutes_conversations_destroy, { tweet_id: id });
    }



    /**
     * Gets a user by their id or \@username
     * 
     * @param id id or \@username
     * @param args By username?
     * @returns User
     */
    async getUser(id: string, args?: ByUsername) {
        if (args?.byUsername) {
            return await this.fetch(ENDPOINTS.UserByScreenName, { screen_name: id });
        }

        return await this.fetch(ENDPOINTS.UserByRestId, { userId: id });
    }

    /**
     * Gets multiple users by their id or \@username
     * @param ids ids or \@usernames
     * @param args By username?
     * @returns Users
     */
    async getUsers(ids: [string, ...string[]], args?: ByUsername) {
        if (args?.byUsername) {
            return await this.fetch(ENDPOINTS.UsersByScreenNames, { screen_names: ids });
        }

        return await this.fetch(ENDPOINTS.UsersByRestIds, { userIds: ids });
    }

    /**
     * Gets tweets from a user chronologically
     * @param id User id
     * @param args Cursor only
     * @returns Slice of user tweets
     */
    async getUserTweets(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserTweets, { userId: id, ...args });
    }

    /**
     * Gets tweets and replies from a user chronologically
     * @param id User id
     * @param args Cursor only
     * @returns Slice of user tweets
     */
    async getUserReplies(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserTweetsAndReplies, { userId: id, ...args });
    }

    /**
     * Gets media tweets from a user chronologically
     * @param id User id
     * @param args Cursor only
     * @returns Slice of user media tweets
     */
    async getUserMedia(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserMedia, { userId: id, ...args });
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
    async getUserLikes(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Likes, { userId: id, ...args });
    }

    /**
     * Gets highlighted tweets from a user. This feature is only available to verified users
     * @param id User id
     * @param args Cursor only
     * @returns Slice of tweets
     */
    async getUserHighlightedTweets(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserHighlightsTweets, { userId: id, ...args });
    }

    /**
     * Gets followed users of a user
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    async getFollowing(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Following, { userId: userId, ...args });
    }

    /**
     * Gets followers of a user
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    async getFollowers(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.Followers, { userId: userId, ...args });
    }

    /**
     * Gets followers of a user that you also follow
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    async getFollowersYouKnow(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.FollowersYouKnow, { userId: userId, ...args });
    }

    /**
     * Gets verified followers of a user
     * @param userId 
     * @param args Cursor only
     * @returns Slice of users
     */
    async getVerifiedFollowers(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.BlueVerifiedFollowers, { userId: userId, ...args });
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
    async getSuperFollowing(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserCreatorSubscriptions, { userId: userId, ...args });
    }

    /**
     * Gets affiliates of a business account
     * @param userId Business account user id
     * @param args Cursor only
     * @returns Slice of users
     */
    async getAffiliates(userId: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.UserBusinessProfileTeamTimeline, { userId: userId, teamName: 'NotAssigned', ...args });
    }

    /**
     * Gets lists created by a user
     * @param id User id
     * @param args Cursor only
     * @returns Slice of lists
     */
    async getUserLists(id: string, args?: CursorOnly) {
        return await this.fetch(ENDPOINTS.CombinedLists, { userId: id, ...args });
    }

    /**
     * Follows a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    async followUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unfollows a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    async unfollowUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Enables retweets from a followed user to show up on your timeline
     * @param userId 
     * @returns `true` on success
     */
    async enableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: true });
    }

    /**
     * Disables retweets from a followed user from showing up on your timeline
     * @param userId 
     * @returns `true` on success
     */
    async disableRetweets(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, retweets: false });
    }

    /**
     * Enables receiveing tweet notifications from a user
     * @param userId 
     * @returns `true` on success
     */
    async enableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: true });
    }

    /**
     * Disables receiveing tweet notifications from a user
     * @param userId 
     * @returns `true` on success
     */
    async disableNotifications(userId: string) {
        return await this.fetch(ENDPOINTS.friendships_update, { id: userId, device: false });
    }

    /**
     * Gets incoming follow requests
     * @param args Cursor only
     * @returns User ids
     */
    async getFollowRequests(args: CursorOnly) {
        return await this.fetch(ENDPOINTS.friendships_incoming, { cursor: Number(args?.cursor || '-1') });
    }

    /**
     * Cancel an outgoing follow request to a user
     * @param userId 
     * @param args By username?
     * @returns `true` on success
     */
    async cancelFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_cancel, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Accept an incoming follow request from a user
     * @param userId 
     * @param args By username?
     * @returns `true` on success
     */
    async acceptFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_accept, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Decline an incoming follow request from a user
     * @param userId 
     * @param args By username?
     * @returns `true` on success
     */
    async declineFollowRequest(userId: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.friendships_deny, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    /**
     * Blocks a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    async blockUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.blocks_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unblocks a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    async unblockUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.blocks_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Mutes a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    async muteUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.mutes_users_create, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    /**
     * Unmutes a user
     * @param id 
     * @param args By username?
     * @returns `true` on success
     */
    async unmuteUser(id: string, args?: ByUsername) {
        return await this.fetch(ENDPOINTS.mutes_users_destroy, args?.byUsername ? { screen_name: id } : { user_id: id });
    }




    private async uploadInit(args: { bytes: number, contentType: string }): Promise<TwitterResponse<MediaUploadInit>> {
        const body = new URLSearchParams({
            command: 'INIT',
            total_bytes: args.bytes.toString(),
            media_type: args.contentType,
            media_category: args.contentType.startsWith('video/') ? 'tweet_video' : args.contentType.endsWith('gif') ? 'tweet_gif' : 'tweet_image'
        });

        const response = await fetch('https://upload.x.com/1.1/media/upload.json', {
            method: 'post',
            headers: this.headers(PUBLIC_TOKEN, 'v1.1'),
            body
        });

        if (response.ok) {
            const data = await response.json();
            return {
                errors: [],
                data: data as MediaUploadInit
            };
        }

        return {
            errors: [{
                code: -1,
                message: await response.text()
            }]
        };
    }

    private async uploadAppend(id: string, args: { data: ArrayBuffer, index: number, contentType: string }) {
        const body = new URLSearchParams({
            command: 'APPEND',
            media_id: id,
            segment_index: args.index.toString()
        }).toString();

        let formData = new FormData();
        formData.append('media', new Blob([args.data], { type: args.contentType }));

        return await fetch(`https://upload.x.com/1.1/media/upload.json?${body}`, {
            method: 'post',
            headers: this.headers(PUBLIC_TOKEN, 'fd'),
            body: formData
        });
    }

    private async uploadFinalize(id: string): Promise<TwitterResponse<Media>> {
        const response = await fetch(`https://upload.x.com/1.1/media/upload.json?command=FINALIZE&media_id=${id}`, {
            method: 'post',
            headers: this.headers(PUBLIC_TOKEN, 'v1.1')
        });

        try {
            if (!response.ok) {
                const { errors } = await response.json();
                return { errors: errors ?? [] };
            }

            const data = await response.json();
            return {
                errors: [],
                data: mediaUpload(data)
            };
        } catch (error) {
            return {
                errors: [{
                    code: -1,
                    message: await response.text()
                }]
            };
        }
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
    async upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void): Promise<TwitterResponse<Media>> {
        try {
            const { errors, data: init } = await this.uploadInit({
                bytes: media.byteLength,
                contentType: args.contentType
            });

            if (errors.length) {
                return { errors };
            }

            const chunkSize = args.segmentSizeOverride || 1_084_576;
            const chunksNeeded = Math.ceil(media.byteLength / chunkSize);

            const chunks = [...Array(chunksNeeded).keys()].map(index => media.slice(index * chunkSize, (index + 1) * chunkSize));

            for (const [index, chunk] of chunks.entries()) {
                const response = await this.uploadAppend(init!.media_id_string, { data: chunk, index, contentType: args.contentType });

                if (!response.ok) {
                    const { errors } = await response.json();

                    if (!!errors) {
                        return { errors };
                    }

                    throw response.statusText;
                }

                callback?.(chunk, index, chunksNeeded);
            }

            const final = await this.uploadFinalize(init!.media_id_string);

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
     * @param {string} id Media id
     * @returns {Promise<TwitterResponse<Media>>} Information about the uploaded file
     */
    async mediaStatus(id: string): Promise<TwitterResponse<Media>> {
        const response = await fetch(`https://upload.x.com/1.1/media/upload.json?command=STATUS&media_id=${id}`, {
            headers: this.headers(PUBLIC_TOKEN, 'v1.1')
        });

        try {
            if (!response.ok) {
                const { errors } = await response.json();
                return { errors: errors ?? [] };
            }

            const data = await response.json();
            return {
                errors: [],
                data: mediaUpload(data)
            };
        } catch (error) {
            return {
                errors: [{
                    code: -1,
                    message: await response.text()
                }]
            };
        }
    }

    /**
     * Adds ALT text to an uploaded media
     * @param id 
     * @param text 
     * @returns `true` on success
     */
    async addAltText(id: string, text: string) {
        return await this.fetch(ENDPOINTS.media_metadata_create, {
            allow_download_status: { allow_download: 'true' },
            alt_text: { text },
            media_id: id
        });
    }
}
