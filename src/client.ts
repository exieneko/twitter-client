import { ENDPOINTS } from './endpoints.js';
import type { BirdwatchRateNoteArgs, BlockedAccountsGetArgs, ByUsername, ClientResponse, CommunityTimelineGetArgs, CursorOnly, Entry, ListBySlug, ListCreateArgs, Media, MediaUploadArgs, NotificationGetArgs, QueryBuilder, ScheduledTweetCreateArgs, SearchArgs, ThreadTweetArgs, TimelineGetArgs, TimelineTweet, Tweet, TweetCreateArgs, TweetGetArgs, TweetReplyPermission, TweetTombstone, UnsentTweetsGetArgs, UpdateProfileArgs } from './types/index.js';
import { request, uploadAppend, uploadFinalize, uploadInit, uploadStatus, type Tokens } from './utils.js';

export class TwitterClient {
    #tokens: Tokens;

    constructor(tokens: Tokens) {
        this.#tokens = tokens;
    }

    // account
    async getBlockedAccounts(args?: BlockedAccountsGetArgs) {
        if (args?.imported) {
            return await request(ENDPOINTS.BlockedAccountsImported, this.#tokens, { cursor: args?.cursor });
        }

        return await request(ENDPOINTS.BlockedAccountsAll, this.#tokens, { cursor: args?.cursor });
    }

    async getMutedAccounts(args?: CursorOnly) {
        return await request(ENDPOINTS.MutedAccounts, this.#tokens, args);
    }

    async getSettings() {
        return await request(ENDPOINTS.account_settings, this.#tokens);
    }

    async updateProfile(args: UpdateProfileArgs) {
        return await request(ENDPOINTS.account_update_profile, this.#tokens, {
            name: args.name,
            description: args.description,
            location: args.location,
            url: args.url,
            birthdate_year: args.birthday.getFullYear(),
            birthdate_month: args.birthday.getMonth() + 1,
            birthdate_day: args.birthday.getDate(),
            birthdate_year_visibility: args.birthYearVisibility === 'private' ? 'self' : args.birthYearVisibility === 'mutuals' ? 'mutualfollow' : args.birthYearVisibility,
            birthdate_visibility: args.birthDayVisibility === 'private' ? 'self' : args.birthDayVisibility === 'mutuals' ? 'mutualfollow' : args.birthDayVisibility
        });
    }

    async setAvatar(mediaId: string) {
        return await request(ENDPOINTS.account_update_profile_image, this.#tokens, { media_id: mediaId });
    }

    async verifyCredentials() {
        return await request(ENDPOINTS.account_verify_credentials, this.#tokens);
    }



    // birdwatch
    async getBirdwatchNotesOnTweet(id: string) {
        return await request(ENDPOINTS.BirdwatchFetchNotes, this.#tokens, { tweet_id: id });
    }

    async getBirdwatchUser(alias: string) {
        return await request(ENDPOINTS.BirdwatchFetchBirdwatchProfile, this.#tokens, { alias });
    }

    async rateBirdwatchNote(noteId: string, args: BirdwatchRateNoteArgs) {
        return await request(ENDPOINTS.BirdwatchCreateRating, this.#tokens, {
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

    async unrateBirdwatchNote(noteId: string) {
        return await request(ENDPOINTS.BirdwatchDeleteRating, this.#tokens, { note_id: noteId });
    }



    // bookmarks
    async getBookmarks(args?: CursorOnly) {
        return await request(ENDPOINTS.Bookmarks, this.#tokens, args);
    }

    async searchBookmarks(query: string, args?: CursorOnly) {
        return await request(ENDPOINTS.BookmarkSearchTimeline, this.#tokens, { rawQuery: query, ...args });
    }

    async clearBookmarks() {
        return await request(ENDPOINTS.BookmarksAllDelete, this.#tokens);
    }



    // communities
    async getCommunity(id: string) {
        return await request(ENDPOINTS.CommunityByRestId, this.#tokens, { communityId: id });
    }

    async getCommunityTweets(id: string, args?: CommunityTimelineGetArgs) {
        const rankingMode = args?.sort === 'recent'
            ? 'Recency'
            : 'Relevance';

        return await request(ENDPOINTS.CommunityTweetsTimeline, this.#tokens, { communityId: id, rankingMode, ...args });
    }

    async getCommunityMedia(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.CommunityMediaTimeline, this.#tokens, { communityId: id, ...args });
    }

    async joinCommunity(id: string) {
        return await request(ENDPOINTS.JoinCommunity, this.#tokens, { communityId: id });
    }

    async leaveCommunity(id: string) {
        return await request(ENDPOINTS.LeaveCommunity, this.#tokens, { communityId: id });
    }



    // lists
    async getList(id: string, args?: ListBySlug) {
        if (args?.bySlug) {
            return await request(ENDPOINTS.ListBySlug, this.#tokens, { listId: id });
        }

        return await request(ENDPOINTS.ListByRestId, this.#tokens, { listId: id });
    }

    async getListTweets(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.ListLatestTweetsTimeline, this.#tokens, { listId: id, ...args });
    }

    async getListDiscovery() {
        return await request(ENDPOINTS.ListsDiscovery, this.#tokens);
    }

    async listedOn(args?: CursorOnly) {
        return await request(ENDPOINTS.ListMemberships, this.#tokens, args);
    }

    async getOwnedLists(userId: string, otherUserId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.ListOwnerships, this.#tokens, { userId, isListMemberTargetUserId: otherUserId, ...args });
    }

    async getListMembers(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.ListMembers, this.#tokens, { listId: id, ...args });
    }

    async getListSubscribers(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.ListSubscribers, this.#tokens, { listId: id, ...args });
    }

    async createList(args: ListCreateArgs) {
        return await request(ENDPOINTS.CreateList, this.#tokens, { description: args.description || '', isPrivate: !!args.private, ...args });
    }

    async editList(id: string, args: Required<ListCreateArgs>) {
        return await request(ENDPOINTS.UpdateList, this.#tokens, { listId: id, isPrivate: args.private, ...args });
    }

    async deleteList(id: string) {
        return await request(ENDPOINTS.DeleteList, this.#tokens, { listId: id });
    }

    async setListBanner(listId: string, mediaId: string) {
        if (mediaId) {
            return await request(ENDPOINTS.EditListBanner, this.#tokens, { listId, mediaId });
        }

        return await request(ENDPOINTS.DeleteListBanner, this.#tokens, { listId });
    }

    async listUser(listId: string, userId: string) {
        return await request(ENDPOINTS.ListAddMember, this.#tokens, { listId, userId });
    }

    async unlistUser(listId: string, userId: string) {
        return await request(ENDPOINTS.ListRemoveMember, this.#tokens, { listId, userId });
    }

    async subscribeToList(id: string) {
        return await request(ENDPOINTS.ListSubscribe, this.#tokens, { listId: id });
    }

    async unsubscribeFromList(id: string) {
        return await request(ENDPOINTS.ListUnsubscribe, this.#tokens, { listId: id });
    }

    async pinList(id: string) {
        return await request(ENDPOINTS.PinTimeline, this.#tokens, {
            pinnedTimelineItem: { id, pinned_timeline_type: 'List' }
        });
    }

    async unpinList(id: string) {
        return await request(ENDPOINTS.UnpinTimeline, this.#tokens, {
            pinnedTimelineItem: { id, pinned_timeline_type: 'List' }
        });
    }

    async muteList(id: string) {
        return await request(ENDPOINTS.MuteList, this.#tokens, { listId: id });
    }

    async unmuteList(id: string) {
        return await request(ENDPOINTS.UnmuteList, this.#tokens, { listId: id });
    }



    // notifications
    async getNotifications(args: NotificationGetArgs) {
        const type = args.type === 'mentions'
            ? 'Mentions'
        : args.type === 'verified'
            ? 'Verified'
            : 'All';

        return await request(ENDPOINTS.NotificationsTimeline, this.#tokens, { timeline_type: type, ...args });
    }

    async getNotifiedTweets(args?: CursorOnly) {
        return await request(ENDPOINTS.device_follow, this.#tokens, args);
    }

    async lastSeenCursor(cursor: string) {
        return await request(ENDPOINTS.last_seen_cursor, this.#tokens, { cursor });
    }

    async getUnreadCount() {
        return await request(ENDPOINTS.badge_count, this.#tokens);
    }

    

    // timeline
    async getTimeline(args?: TimelineGetArgs) {
        const seenTweetIds = args?.seenTweetIds ?? [];
        const requestContext = args?.cursor ? undefined : 'launch';

        if (args?.type === 'chronological') {
            return await request(ENDPOINTS.HomeLatestTimeline, this.#tokens, { seenTweetIds, requestContext, cursor: args.cursor });
        }

        return await request(ENDPOINTS.HomeTimeline, this.#tokens, { seenTweetIds, requestContext, cursor: args?.cursor });
    }

    async search(query: string | QueryBuilder, args?: SearchArgs) {
        return await request(ENDPOINTS.SearchTimeline, this.#tokens, { rawQuery: typeof query === 'string' ? query : query.toString(), querySource: 'typed_query', product: 'Top', cursor: args?.cursor });
    }

    async typeahead(query: string) {
        return await request(ENDPOINTS.search_typeahead, this.#tokens, { q: query });
    }



    // tweet
    async createTweet(args: TweetCreateArgs, thread?: ThreadTweetArgs[]): Promise<ClientResponse<Tweet | TweetTombstone>> {
        const mode = args.replyPermission === 'following'
            ? 'Community'
        : args.replyPermission === 'verified'
            ? 'Verified'
        : args.replyPermission === 'mentioned'
            ? 'ByInvitation'
            : undefined;

        const [e, tweet] = await request(ENDPOINTS.CreateTweet, this.#tokens, {
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
            return [e, tweet];
        }

        if (!thread?.length || !tweet?.id) {
            return [e, tweet];
        }

        let lastTweetId = tweet.id;

        for (const t of thread) {
            const [, data] = await request(ENDPOINTS.CreateTweet, this.#tokens, {
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
                return [e, tweet];
            }

            lastTweetId = data.id;
        }

        return [e, tweet];
    }

    /** @deprecated Use the `createTweet` method instead */
    tweet = this.createTweet;

    async deleteTweet(id: string) {
        return await request(ENDPOINTS.DeleteTweet, this.#tokens, { tweet_id: id });
    }

    async createScheduledTweet(args: ScheduledTweetCreateArgs) {
        return await request(ENDPOINTS.CreateScheduledTweet, this.#tokens, {
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
        return await request(ENDPOINTS.EditScheduledTweet, this.#tokens, {
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
        return await request(ENDPOINTS.FetchScheduledTweets, this.#tokens, { ascending: !!args?.ascending });
    }

    async getTweet(id: string, args?: TweetGetArgs) {
        const rankingMode = args?.sort === 'recent'
            ? 'Recency'
        : args?.sort === 'likes'
            ? 'Likes'
            : 'Relevance';

        return await request(ENDPOINTS.TweetDetail, this.#tokens, { focalTweetId: id, rankingMode, ...args });
    }

    async getTweetResult(id: string) {
        return await request(ENDPOINTS.TweetResultByRestId, this.#tokens, { tweetId: id });
    }

    async getTweetResults(ids: [string, ...string[]]) {
        return await request(ENDPOINTS.TweetResultsByRestIds, this.#tokens, { tweetIds: ids });
    }

    async getHiddenReplies(tweetId: string) {
        return await request(ENDPOINTS.ModeratedTimeline, this.#tokens, { rootTweetId: tweetId });
    }

    async getLikes(tweetId: string) {
        return await request(ENDPOINTS.Favoriters, this.#tokens, { tweetId: tweetId });
    }

    async getRetweets(tweetId: string) {
        return await request(ENDPOINTS.Retweeters, this.#tokens, { tweetId: tweetId });
    }

    async getQuoteTweets(tweetId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.SearchTimeline, this.#tokens, { rawQuery: `quoted_tweet_id:${tweetId}`, querySource: 'tdqt', product: 'Top', ...args }) as ClientResponse<Entry<TimelineTweet>[]>;
    }

    /** @deprecated */
    getQuotedTweets = this.getQuoteTweets;

    async bookmark(tweetId: string) {
        return await request(ENDPOINTS.CreateBookmark, this.#tokens, { tweet_id: tweetId });
    }

    async unbookmark(tweetId: string) {
        return await request(ENDPOINTS.DeleteBookmark, this.#tokens, { tweet_id: tweetId });
    }

    async like(tweetId: string) {
        return await request(ENDPOINTS.FavoriteTweet, this.#tokens, { tweet_id: tweetId });
    }

    async unlike(tweetId: string) {
        return await request(ENDPOINTS.UnfavoriteTweet, this.#tokens, { tweet_id: tweetId });
    }

    async retweet(tweetId: string) {
        return await request(ENDPOINTS.CreateRetweet, this.#tokens, { tweet_id: tweetId });
    }

    async unretweet(tweetId: string) {
        return await request(ENDPOINTS.DeleteRetweet, this.#tokens, { source_tweet_id: tweetId });
    }

    async hideTweet(id: string) {
        return await request(ENDPOINTS.ModerateTweet, this.#tokens, { tweetId: id });
    }

    async unhideTweet(id: string) {
        return await request(ENDPOINTS.UnmoderateTweet, this.#tokens, { tweetId: id });
    }

    async pinTweet(id: string) {
        return await request(ENDPOINTS.PinTweet, this.#tokens, { tweet_id: id });
    }

    async unpinTweet(id: string) {
        return await request(ENDPOINTS.UnpinTweet, this.#tokens, { tweet_id: id });
    }

    async changeReplyPermission(tweetId: string, permission?: TweetReplyPermission) {
        if (!permission || permission === 'none') {
            return await request(ENDPOINTS.ConversationControlDelete, this.#tokens, { tweet_id: tweetId });
        }

        const mode = permission === 'following'
            ? 'Community'
        : permission === 'verified'
            ? 'Verified'
            : 'ByInvitation';

        return await request(ENDPOINTS.ConversationControlChange, this.#tokens, { tweet_id: tweetId, mode });
    }

    async unmention(id: string) {
        return await request(ENDPOINTS.UnmentionUserFromConversation, this.#tokens, { tweet_id: id });
    }

    async muteTweet(id: string) {
        return await request(ENDPOINTS.mutes_conversations_create, this.#tokens, { tweet_id: id });
    }

    async unmuteTweet(id: string) {
        return await request(ENDPOINTS.mutes_conversations_destroy, this.#tokens, { tweet_id: id });
    }



    // users
    async getUser(id: string, args?: ByUsername) {
        if (args?.byUsername) {
            return await request(ENDPOINTS.UserByScreenName, this.#tokens, { screen_name: id });
        }

        return await request(ENDPOINTS.UserByRestId, this.#tokens, { userId: id });
    }

    async getUsers(ids: [string, ...string[]], args?: ByUsername) {
        if (args?.byUsername) {
            return await request(ENDPOINTS.UsersByScreenNames, this.#tokens, { screen_names: ids });
        }

        return await request(ENDPOINTS.UsersByRestIds, this.#tokens, { userIds: ids });
    }

    async getUserTweets(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.UserTweets, this.#tokens, { userId: id, ...args });
    }

    async getUserReplies(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.UserTweetsAndReplies, this.#tokens, { userId: id, ...args });
    }

    async getUserMedia(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.UserMedia, this.#tokens, { userId: id, ...args });
    }

    async getUserLikes(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.Likes, this.#tokens, { userId: id, ...args });
    }

    async getUserHighlightedTweets(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.UserHighlightsTweets, this.#tokens, { userId: id, ...args });
    }

    async getFollowing(userId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.Following, this.#tokens, { userId: userId, ...args });
    }

    async getFollowers(userId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.Followers, this.#tokens, { userId: userId, ...args });
    }

    async getFollowersYouKnow(userId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.FollowersYouKnow, this.#tokens, { userId: userId, ...args });
    }

    async getVerifiedFollowers(userId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.BlueVerifiedFollowers, this.#tokens, { userId: userId, ...args });
    }

    async getSuperFollowing(userId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.UserCreatorSubscriptions, this.#tokens, { userId: userId, ...args });
    }

    async getAffiliates(userId: string, args?: CursorOnly) {
        return await request(ENDPOINTS.UserBusinessProfileTeamTimeline, this.#tokens, { userId: userId, teamName: 'NotAssigned', ...args });
    }

    async getUserLists(id: string, args?: CursorOnly) {
        return await request(ENDPOINTS.CombinedLists, this.#tokens, { userId: id, ...args });
    }

    async followUser(id: string, args?: ByUsername) {
        return await request(ENDPOINTS.friendships_create, this.#tokens, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    async unfollowUser(id: string, args?: ByUsername) {
        return await request(ENDPOINTS.friendships_destroy, this.#tokens, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    async enableRetweets(userId: string) {
        return await request(ENDPOINTS.friendships_update, this.#tokens, { id: userId, retweets: true });
    }

    async disableRetweets(userId: string) {
        return await request(ENDPOINTS.friendships_update, this.#tokens, { id: userId, retweets: false });
    }

    async enableNotifications(userId: string) {
        return await request(ENDPOINTS.friendships_update, this.#tokens, { id: userId, device: true });
    }

    async disableNotifications(userId: string) {
        return await request(ENDPOINTS.friendships_update, this.#tokens, { id: userId, device: false });
    }

    async cancelFollowRequest(userId: string, args?: ByUsername) {
        return await request(ENDPOINTS.friendships_cancel, this.#tokens, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    async acceptFollowRequest(userId: string, args?: ByUsername) {
        return await request(ENDPOINTS.friendships_accept, this.#tokens, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    async declineFollowRequest(userId: string, args?: ByUsername) {
        return await request(ENDPOINTS.friendships_deny, this.#tokens, args?.byUsername ? { screen_name: userId } : { user_id: userId });
    }

    async blockUser(id: string, args?: ByUsername) {
        return await request(ENDPOINTS.blocks_create, this.#tokens, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    async unblockUser(id: string, args?: ByUsername) {
        return await request(ENDPOINTS.blocks_destroy, this.#tokens, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    async muteUser(id: string, args?: ByUsername) {
        return await request(ENDPOINTS.mutes_users_create, this.#tokens, args?.byUsername ? { screen_name: id } : { user_id: id });
    }

    async unmuteUser(id: string, args?: ByUsername) {
        return await request(ENDPOINTS.mutes_users_destroy, this.#tokens, args?.byUsername ? { screen_name: id } : { user_id: id });
    }



    /**
     * Sends several requests to upload a media file
     * @param {ArrayBuffer} media The entire file as an `ArrayBuffer`
     * @param {MediaUploadArgs} args Additional options to send with the requests
     * @param {(chunk: ArrayBuffer, index: number, total: number) => void} callback Optional callback occuring after a successful upload of each chunk
     * @returns {Promise<ClientResponse<Media>>} Information about the uploaded file
     */
    async upload(media: ArrayBuffer, args: MediaUploadArgs, callback?: (chunk: ArrayBuffer, index: number, total: number) => void): Promise<ClientResponse<Media>> {
        try {
            const [errors, init] = await uploadInit(this.#tokens, {
                bytes: media.byteLength,
                contentType: args.contentType
            });

            if (errors.length) {
                return [errors];
            }

            const chunkSize = args.segmentSizeOverride || 1_084_576;
            const chunksNeeded = Math.ceil(media.byteLength / chunkSize);

            const chunks = [...Array(chunksNeeded).keys()].map(index => media.slice(index * chunkSize, (index + 1) * chunkSize));

            for (const [index, chunk] of chunks.entries()) {
                const response = await uploadAppend(this.#tokens, {
                    id: init!.media_id_string,
                    data: chunk,
                    index,
                    contentType: args.contentType
                });

                if (!response.ok) {
                    const { errors } = await response.json();

                    if (!!errors) {
                        return [errors];
                    }

                    throw response.statusText;
                }

                callback?.(chunk, index, chunksNeeded);
            }

            const final = await uploadFinalize(this.#tokens, { id: init!.media_id_string });

            if (!!final.at(1) && !!args.altText) {
                this.addAltText(init!.media_id_string, args.altText);
            }

            return final;
        } catch (error) {
            return [[{
                code: -1,
                message: String(error)
            }]];
        }
    }

    /**
     * Check the current status of an uploaded media file
     * @param {string} id Media id
     * @returns {Promise<ClientResponse<Media>>} Information about the uploaded file
     */
    async mediaStatus(id: string): Promise<ClientResponse<Media>> {
        return await uploadStatus(this.#tokens, { id });
    }

    async addAltText(id: string, text: string) {
        return await request(ENDPOINTS.media_metadata_create, this.#tokens, {
            allow_download_status: { allow_download: 'true' },
            alt_text: { text },
            media_id: id
        });
    }
}
