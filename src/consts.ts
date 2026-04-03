import * as flags from './flags.js';
import type { AboutUser, BirdwatchHelpfulTag, BirdwatchNotesOnTweet, BirdwatchUnhelpfulTag, BirdwatchUser, CommunityKind, DraftTweet, List, ListKind, Media, MediaUploadInit, Notification, ScheduledTweet, Settings, Slice, Trend, Tweet, TweetKind, TweetTombstone, TwitterResponse, Typeahead, UnreadCount, User, UserKind } from './types/index.js';
import { Endpoint, type EndpointGroup } from './types/internal.js';
import * as parsers from './types/parsers.js';
import { gql, v11 } from './utils/index.js';

export const PUBLIC_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
export const ALT_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F';
export const OAUTH_KEY = 'Bearer AAAAAAAAAAAAAAAAAAAAAG5LOQEAAAAAbEKsIYYIhrfOQqm4H8u7xcahRkU%3Dz98HKmzbeXdKqBfUDmElcqYl0cmmKY9KdS2UoNIz3Phapgsowi';

export const MAX_ACCEPTABLE_REQUEST_TIME = 1 << 10;
export const UPLOAD_SEGMENT_SIZE = 1 << 20;
export const MAX_TIMELINE_ITERATIONS = 5;
export const TWEET_CHARACTER_LIMIT = 280;

export const EMPTY_SLICE: TwitterResponse<Slice<any>> = {
    errors: [],
    data:  {
        entries: [],
        cursors: {}
    }
};

export const GLOBAL_HEADERS = {
    Accept: '*/*',
    Connection: 'keep-alive',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session'
};

// all graphql query ids last updated on 2026-01-02
export const ENDPOINTS = {
    // ACCOUNT
    BlockedAccountsAll: new Endpoint<Slice<UserKind>, { cursor?: string }>({
        url: gql('cViKW5oZPiIce0MOSKYblw/BlockedAccountsAll'),
        method: 'get',
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.viewer.timeline.timeline.instructions)),
    BlockedAccountsImported: new Endpoint<Slice<UserKind>, { cursor?: string }>({
        url: gql('CJ8VCYGYHBNu2Dq2AdgO2w/BlockedAccountsImported'),
        method: 'get',
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.viewer.timeline.timeline.instructions)),
    MutedAccounts: new Endpoint<Slice<UserKind>, { cursor?: string }>({
        url: gql('mJA1YbOoJTyoB64W9hd6ZQ/MutedAccounts'),
        method: 'get',
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.viewer.muting_timeline.timeline.instructions)),
    account_settings: new Endpoint<Settings, {}>({
        url: v11('account/settings.json'),
        method: 'get',
        variables: {"include_ext_sharing_audiospaces_listening_data_with_followers":true,"include_mention_filter":true,"include_nsfw_user_flag":true,"include_nsfw_admin_flag":true,"include_ranked_timeline":true,"include_alt_text_compose":true,"include_ext_dm_av_call_settings":true,"ext":"ssoConnections","include_country_code":true,"include_ext_dm_nsfw_media_filter":true},
        requiresTransactionId: true
    }, async (fmt, value) => parsers.settings(value)),
    account_update_profile: new Endpoint<boolean, {
        birthdate_day: number,
        birthdate_month: number,
        birthdate_year: number,
        birthdate_visibility: 'self' | 'followers' | 'following' | 'mutualfollow' | 'public',
        birthdate_year_visibility: 'self' | 'followers' | 'following' | 'mutualfollow' | 'public',
        url: string,
        name: string,
        description: string,
        location: string
    }>({
        url: v11('account/update_profile.json'),
        method: 'post',
        variables: {"displayNameMaxLength":50},
        requiresTransactionId: true
    }, async (fmt, value) => !!value.id_str),
    account_update_profile_image: new Endpoint<boolean, { media_id: string }>({
        url: v11('account/update_profile_image.json'),
        method: 'post',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"return_user":true},
        requiresTransactionId: true
    }, async (fmt, value) => !!value.id_str),
    account_verify_credentials: new Endpoint<User, {}>({
        url: v11('account/verify_credentials.json'),
        method: 'get',
        requiresTransactionId: true
    }, async (fmt, value) => parsers.userLegacy(value)),



    // BIRDWATCH
    BirdwatchFetchGlobalTimeline: new Endpoint<Slice<TweetKind>, {}>({
        url: gql('rG-k-eTUj0YhAqXkSNJbiQ/BirdwatchFetchGlobalTimeline'),
        method: 'get',
        features: flags.timeline
    }, async (fmt, value) => parsers.birdwatch(value.data.viewer.birdwatch_home_page)),
    BirdwatchFetchNotes: new Endpoint<BirdwatchNotesOnTweet, { tweet_id: string }>({
        url: gql('dG85JgBxwnAt_PYNZTyvTg/BirdwatchFetchNotes'),
        method: 'get',
        features: flags.birdwatch
    }, async (fmt, value) => parsers.birdwatchTweet(value.data.tweet_result_by_rest_id.result)),
    BirdwatchFetchBirdwatchProfile: new Endpoint<BirdwatchUser, { alias: string }>({
        url: gql('id9iGfEQF47W1kvRBHUmRQ/BirdwatchFetchBirdwatchProfile'),
        method: 'get'
    }, async (fmt, value) => parsers.birdwatchUser(value.data.birdwatch_profile_by_alias, false)),
    BirdwatchCreateRating: new Endpoint<boolean, {
        data_v2: {
            helpful_tags?: BirdwatchHelpfulTag[],
            not_helpful_tags?: BirdwatchUnhelpfulTag[],
            helpfulness_level: 'Helpful' | 'SomewhatHelpful' | 'NotHelpful'
        },
        note_id: string,
        rating_source: 'BirdwatchForYouTimeline' | 'BirdwatchHomeNeedsYourHelp',
        tweet_id: string
    }>({
        url: gql('gbshFt1Vmddrlio4vHWhhQ/BirdwatchCreateRating'),
        method: 'post',
        variables: {"source_platform":"BirdwatchWeb"}
    }, async (fmt, value) => value.data.birdwatchnote_rate_v3?.__typename === 'BirdwatchNoteRating'),
    BirdwatchDeleteRating: new Endpoint<boolean, { note_id: string }>({
        url: gql('OpvCOyOoQClUND66zDzrnA/BirdwatchDeleteRating'),
        method: 'post'
    }, async (fmt, value) => value.data.birdwatchnote_rating_delete === 'Done'),



    // BOOKMARKS
    Bookmarks: new Endpoint<Slice<TweetKind>, { cursor?: string }>({
        url: gql('E6jlrZG4703s0mcA9DfNKQ/Bookmarks'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.bookmark_timeline_v2.timeline.instructions)),
    BookmarkSearchTimeline: new Endpoint<Slice<TweetKind>, { rawQuery: string, cursor?: string }>({
        url: gql('9467z_eRSDs6mi8CHRLxnA/BookmarkSearchTimeline'),
        method: 'get',
        variables: {"count":50},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.search_by_raw_query.bookmarks_search_timeline.timeline.instructions)),
    CreateBookmark: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('aoDbu3RHznuiSkQ9aNM67Q/CreateBookmark'),
        method: 'post',
        token: OAUTH_KEY
    }, async (fmt, value) => value.data.tweet_bookmark_put === 'Done'),
    DeleteBookmark: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('Wlmlj2-xzyS1GN3a6cj-mQ/DeleteBookmark'),
        method: 'post',
        token: OAUTH_KEY
    }, async (fmt, value) => value.data.tweet_bookmark_delete === 'Done'),
    BookmarksAllDelete: new Endpoint<boolean, {}>({
        url: gql('skiACZKC1GDYli-M8RzEPQ/BookmarksAllDelete'),
        method: 'post',
        token: OAUTH_KEY
    }, async (fmt, value) => value.data.bookmark_all_delete === 'Done'),



    // COMMUNITY
    CommunityByRestId: new Endpoint<CommunityKind, { communityId: string }>({
        url: gql('iO-Ycgd1CdS0xk9nQYMCaA/CommunityByRestId'),
        method: 'get',
        features: flags.short
    }, async (fmt, value) => parsers.community(value.data.communityResults.result)),
    CommunityTweetsTimeline: new Endpoint<Slice<TweetKind>, { communityId: string, rankingMode: 'Relevance' | 'Recency', cursor?: string }>({
        url: gql('ZoPkicnDp0_M60vVsWxf7w/CommunityTweetsTimeline'),
        method: 'get',
        variables: {"count":20,"displayLocation":"Community","withCommunity":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.communityResults.result.ranked_community_timeline.timeline.instructions)),
    CommunityMediaTimeline: new Endpoint<Slice<TweetKind>, { communityId: string, cursor?: string }>({
        url: gql('_DJU-HFPmQZX0_nclxm0Qg/CommunityMediaTimeline'),
        method: 'get',
        variables: {"count":20,"displayLocation":"Community","withCommunity":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.mediaEntries(value.data.communityResults.result.ranked_community_timeline.timeline.instructions, {
        content: value.data.communityResults.result.ranked_community_timeline.timeline.instructions.find((i: any) => i.type === 'TimelineAddToModule'),
        key: 'moduleItems'
    })),
    JoinCommunity: new Endpoint<boolean, { communityId: string }>({
        url: gql('b9bfcMQtJqWWCoyuM91Cpw/JoinCommunity'),
        method: 'get',
        features: flags.short
    }, async (fmt, value) => !!value.data.community_join.id_str),
    LeaveCommunity: new Endpoint<boolean, { communityId: string }>({
        url: gql('LLQ-xxy7KYe7VJFtRO31ig/LeaveCommunity'),
        method: 'get',
        features: flags.short
    }, async (fmt, value) => !!value.data.community_leave.id_str),



    // DISCOVER
    ExplorePage: new Endpoint<Slice<TweetKind | Trend>, { cursor: string }>({
        url: 'r-XJpn_t210wJmpV9qnAHg/ExplorePage',
        method: 'get',
        features: flags.timeline
    }, async (fmt, value) => parsers.discoverEntries(value.data.explore_page.body)),
    ExploreSidebar: new Endpoint<Slice<Trend>, {}>({
        url: 'FrpzJjnhtQSrL4txK29E7A/ExploreSidebar',
        method: 'get',
        features: flags.timeline
    }, async (fmt, value) => parsers.trendEntries(value.data.explore_sidebar.timeline.instructions)),



    // LIST
    ListByRestId: new Endpoint<ListKind, { listId: string }>({
        url: gql('Tzkkg-NaBi_y1aAUUb6_eQ/ListByRestId'),
        method: 'get',
        features: flags.short
    }, async (fmt, value) => parsers.list(value.data.list)),
    ListBySlug: new Endpoint<ListKind, { listId: string }>({
        url: gql('kPoa5ip1Zl3rYF0T-e2HcA/ListBySlug'),
        method: 'get',
        features: flags.short
    }, async (fmt, value) => parsers.list(value.data.list)),
    ListLatestTweetsTimeline: new Endpoint<Slice<TweetKind>, { listId: string, cursor?: string }>({
        url: gql('fqNUs_6rqLf89u_2waWuqg/ListLatestTweetsTimeline'),
        method: 'get',
        variables: {"count":40},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.list.tweets_timeline.timeline.instructions)),
    /** @todo */
    ListsManagementPageTimeline: new Endpoint<unknown, {}>({
        url: gql('mjBb_n_f5Ci-eIysajMRWQ/ListsManagementPageTimeline'),
        method: 'get',
        variables: {"count":100},
        features: flags.timeline
    }, async (fmt, value) => value),
    ListsDiscovery: new Endpoint<Slice<ListKind>, {}>({
        url: gql('WcZy_1yhZQ5zOabw_WElww/ListsDiscovery'),
        method: 'get',
        variables: {"count":40},
        features: flags.timeline
    }, async (fmt, value) => parsers.listEntries(value.data.list_discovery_list_mixer_timeline.timeline.instructions)),
    ListMemberships: new Endpoint<Slice<ListKind>, { cursor?: string }>({
        url: gql('X6U9LAaMZ5C8MvPM12aK2A/ListMemberships'),
        method: 'get',
        variables: {"count":20},
        features: flags.timeline
    }, async (fmt, value) => parsers.listEntries(value.data.user.result.timeline.instructions)),
    ListOwnerships: new Endpoint<Slice<ListKind>, { userId: string, isListMemberTargetUserId: string, cursor?: string }>({
        url: gql('k0_MqdZDcbfRtDVuuk2Dig/ListOwnerships'),
        method: 'get',
        variables: {"count":20},
        features: flags.timeline
    }, async (fmt, value) => parsers.listEntries(value.data.user.result.timeline.instructions)),
    ListMembers: new Endpoint<Slice<UserKind>, { listId: string, cursor?: string }>({
        url: gql('Bnhcen0kdsMAU1tW7U79qQ/ListMembers'),
        method: 'get',
        variables: {"count":40},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.list.members_timeline.timeline.instructions)),
    ListSubscribers: new Endpoint<Slice<UserKind>, { listId: string, cursor?: string }>({
        url: gql('5EDvteYto4oDpMVpPG1cPw/ListSubscribers'),
        method: 'get',
        variables: {"count":40},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.list.subscribers_timeline.timeline.instructions)),
    ListCreationRecommendedUsers: new Endpoint<Slice<UserKind>, { listId: string, cursor?: string }>({
        url: gql('nD2vOulHcOJhgSQH5ICIIg/ListCreationRecommendedUsers'),
        method: 'get',
        variables: {"count":20},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.list.recommended_users.timeline.instructions)),
    ListEditRecommendedUsers: new Endpoint<Slice<UserKind>, { listId: string, cursor?: string }>({
        url: gql('lEEGoONAojgrJ1oXe3yoUA/ListEditRecommendedUsers'),
        method: 'get',
        variables: {"count":20},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.list.recommended_users.timeline.instructions)),
    CombinedLists: new Endpoint<Slice<ListKind>, { userId: string, cursor?: string }>({
        url: gql('NFidCm38TCj56xu-yOqOXA/CombinedLists'),
        method: 'get',
        variables: {"count":100},
        features: flags.timeline
    }, async (fmt, value) => parsers.listEntries(value.data.user.result.timeline.timeline.instructions)),
    CreateList: new Endpoint<ListKind, { name: string, description: string, isPrivate: boolean }>({
        url: gql('CzrvV0ePRFW1dPgLY6an7g/CreateList'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => parsers.list(value.list) as List),
    DeleteList: new Endpoint<unknown, { listId: string }>({
        url: gql('UnN9Th1BDbeLjpgjGSpL3Q/DeleteList'),
        method: 'post'
    }, async (fmt, value) => value.list_delete === 'Done'),
    UpdateList: new Endpoint<boolean, { listId: string, name: string, description: string, isPrivate: boolean }>({
        url: gql('CToNDwmbHSq5tqV0ExBFeg/UpdateList'),
        method: 'post'
    }, async (fmt, value) => !!value.data.list.id_str),
    EditListBanner: new Endpoint<boolean, { listId: string, mediaId: string }>({
        url: gql('CChy7omMr21Rx5xgqzTDeA/EditListBanner'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.list.id_str),
    DeleteListBanner: new Endpoint<boolean, { listId: string }>({
        url: gql('uT6t6CXdWqMF9UBPaQgxjw/DeleteListBanner'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.list.id_str),
    ListAddMember: new Endpoint<boolean, { listId: string, userId: string }>({
        url: gql('EadD8ivrhZhYQr2pDmCpjA/ListAddMember'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.list.id_str),
    ListRemoveMember: new Endpoint<boolean, { listId: string, userId: string }>({
        url: gql('B5tMzrMYuFHJex_4EXFTSw/ListRemoveMember'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.list.id_str),
    ListSubscribe: new Endpoint<boolean, { listId: string }>({
        url: gql('qItCdxZic3vKHuF2nwO5cg/ListSubscribe'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.list_subscribe_v3.id_str),
    ListUnsubscribe: new Endpoint<boolean, { listId: string }>({
        url: gql('lJyQ2Rp6vk4h5czTYqOeLA/ListUnsubscribe'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.list.id_str),
    PinTimeline: new Endpoint<boolean, { pinnedTimelineItem: { id: string, pinned_timeline_type: 'List' } }>({
        url: gql('y62a1ZmM0tI0kjTj4j8-LA/PinTimeline'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.pin_timeline.updated_pinned_timeline.list.id_str),
    UnpinTimeline: new Endpoint<boolean, { pinnedTimelineItem: { id: string, pinned_timeline_type: 'List' } }>({
        url: gql('_flfMJhBPURJJLxAuIFAfw/UnpinTimeline'),
        method: 'post',
        features: flags.short
    }, async (fmt, value) => !!value.data.unpin_timeline.updated_pinned_timeline.list.id_str),
    MuteList: new Endpoint<boolean, { listId: string }>({
        url: gql('ZYyanJsskNUcltu9bliMLA/MuteList'),
        method: 'post'
    }, async (fmt, value) => value.data.list === 'Done'),
    UnmuteList: new Endpoint<boolean, { listId: string }>({
        url: gql('pMZrHRNsmEkXgbn3tOyr7Q/UnmuteList'),
        method: 'post'
    }, async (fmt, value) => value.data.list === 'Done'),



    // NOTIFICATIONS
    NotificationsTimeline: new Endpoint<Slice<Notification>, { timeline_type: 'All' | 'Verified' | 'Mentions', cursor?: string }>({
        url: gql('Ev6UMJRROInk_RMH2oVbBg/NotificationsTimeline'),
        method: 'get',
        variables: {"count":40},
        features: flags.timeline
    }, async (fmt, value) => parsers.notificationEntries(value.data.viewer_v2.user_results.result.notification_timeline.timeline.instructions)),
    badge_count: new Endpoint<UnreadCount, {}>({
        url: 'https://twitter.com/i/api/2/badge_count/badge_count.json',
        method: 'get',
        variables: {"supports_ntab_urt":1,"include_xchat_count":1}
    }, async (fmt, value) => parsers.unreadCount(value)),
    last_seen_cursor: new Endpoint<unknown, { cursor: string }>({
        url: 'https://twitter.com/i/api/2/notifications/all/last_seen_cursor.json',
        method: 'post'
    }, async (fmt, value) => value.cursor),
    device_follow: new Endpoint<Slice<TweetKind>, { cursor?: string }>({
        url: 'https://twitter.com/i/api/2/notifications/device_follow.json',
        method: 'get',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_has_nft_avatar":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"cards_platform":"Web-12","include_cards":1,"include_ext_alt_text":true,"include_ext_limited_action_results":true,"include_quote_count":true,"include_reply_count":1,"tweet_mode":"extended","include_ext_views":true,"include_entities":true,"include_user_entities":true,"include_ext_media_color":true,"include_ext_media_availability":true,"include_ext_sensitive_media_warning":true,"include_ext_trusted_friends_metadata":true,"send_error_codes":true,"simple_quoted_tweet":true,"count":20,"requestContext":"launch","ext":"mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CbirdwatchPivot%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl"}
    }, async (fmt, value) => parsers.deviceFollowEntries(value.timeline.instructions[0].addEntries.entries, value.globalObjects)),

    // SEARCH
    SearchTimeline: new Endpoint<Slice<TweetKind | UserKind | ListKind>, { rawQuery: string, querySource: 'typed_query' | 'recent_search_click' | 'tdqt', product: 'Top' | 'Latest' | 'People' | 'Media' | 'Lists', cursor?: string }>({
        url: gql('M1jEez78PEfVfbQLvlWMvQ/SearchTimeline'),
        method: 'get',
        variables: {"count":40},
        features: flags.timeline,
        token: ALT_TOKEN,
    }, async (fmt, value) => parsers.searchEntries(value.data.search_by_raw_query.search_timeline.timeline.instructions)),
    search_typeahead: new Endpoint<Typeahead, { q: string }>({
        url: v11('search/typeahead.json'),
        method: 'get',
        variables: {"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"src":"search_box","result_type":"events,users,topics,lists"}
    }, async (fmt, value) => parsers.typeahead(value)),



    // TIMELINE
    HomeLatestTimeline: new Endpoint<Slice<TweetKind>, { seenTweetIds: string[], requestContext?: 'launch', cursor?: string }>({
        url: gql('_qO7FJzShSKYWi9gtboE6A/HomeLatestTimeline'),
        method: 'get',
        variables: {"count":20,"includePromotedContent":false,"latestControlAvailable":true,"withCommunity":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.home.home_timeline_urt.instructions)),
    HomeTimeline: new Endpoint<Slice<TweetKind>, { seenTweetIds: string[], requestContext?: 'launch', cursor?: string }>({
        url: gql('V7xdnRnvW6a8vIsMr9xK7A/HomeTimeline'),
        method: 'get',
        variables: {"count":20,"includePromotedContent":false,"latestControlAvailable":true,"withCommunity":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.home.home_timeline_urt.instructions)),
    GenericTimelineById: new Endpoint<Slice<TweetKind>, { timelineId: string, cursor?: string }>({
        url: gql('8Ncv6o18kamVfavnfvrSTA/GenericTimelineById'),
        method: 'get',
        variables: {"count":20,"withQuickPromoteEligibilityTweetFields":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.timeline.timeline.instructions)),
    GenericTimelineById_TRENDS: new Endpoint<Slice<Trend>, { timelineId: string, cursor?: string }>({
        url: gql('8Ncv6o18kamVfavnfvrSTA/GenericTimelineById'),
        method: 'get',
        variables: {"count":20,"withQuickPromoteEligibilityTweetFields":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.trendEntries(value.data.timeline.timeline.instructions)),



    // TWEET
    CreateTweet: new Endpoint<Tweet, {
        batch_compose?: 'BatchFirst' | 'BatchSubsequent',
        card_uri?: string,
        conversation_control?: {
            mode: 'Community' | 'Verified' | 'ByInvitation'
        },
        content_disclosure?: {
            advertising_promotion?: {
                is_paid_promotion: boolean
            },
            ai_generated_disclosure?: {
                has_ai_generated_media: boolean
            }
        },
        media: {
            media_entities: {
                media_id: string,
                tagged_users: string[]
            }[],
            possibly_sensitive: boolean
        },
        reply?: {
            exclude_reply_user_ids: string[],
            in_reply_to_tweet_id: string
        },
        semantic_annotation_ids: string[],
        tweet_text: string
    }>({
        url: gql('Uf3io9zVp1DsYxrmL5FJ7g/CreateTweet'),
        method: 'post'
    }, async (fmt, value) => parsers.tweet(value.data.create_tweet?.tweet_results?.result) as Tweet),
    CreateNoteTweet: new Endpoint<Tweet, {
        batch_compose?: 'BatchFirst' | 'BatchSubsequent',
        card_uri?: string,
        conversation_control?: {
            mode: 'Community' | 'Verified' | 'ByInvitation'
        },
        media: {
            media_entities: {
                media_id: string,
                tagged_users: string[]
            }[],
            possibly_sensitive: boolean
        },
        reply?: {
            exclude_reply_user_ids: string[],
            in_reply_to_tweet_id: string
        },
        semantic_annotation_ids: string[],
        tweet_text: string
    }>({
        url: gql('lPTBLb_FPA5r8z_cH-s8lw/CreateNoteTweet'),
        method: 'post'
    }, async (fmt, value) => parsers.tweet(value.data.notetweet_create?.tweet_results?.result) as Tweet),
    DeleteTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('VaenaVgh5q5ih7kvyVjgtg/DeleteTweet'),
        method: 'post',
        variables: {"dark_request":false}
    }, async (fmt, value) => !!value.delete_tweet),
    CreateScheduledTweet: new Endpoint<string, {
        execute_at: number,
        post_tweet_request: {
            auto_populate_reply_metadata: boolean,
            exclude_reply_user_ids: string[],
            media_ids: string[],
            status: string
        }
    }>({
        url: gql('LCVzRQGxOaGnOnYH01NQXg/CreateScheduledTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.tweet?.rest_id as string),
    EditScheduledTweet: new Endpoint<boolean, {
        execute_at: number,
        post_tweet_request: {
            auto_populate_reply_metadata: boolean,
            exclude_reply_user_ids: string[],
            media_ids: string[],
            status: string
        },
        scheduled_tweet_id: string
    }>({
        url: gql('_mHkQ5LHpRRjSXKOcG6eZw/EditScheduledTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.scheduledtweet_put === 'Done'),
    DeleteScheduledTweet: new Endpoint<boolean, { scheduled_tweet_id: string }>({
        url: gql('CTOVqej0JBXAZSwkp1US0g/DeleteScheduledTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.scheduledtweet_delete === 'Done'),
    CreateDraftTweet: new Endpoint<string, {
        post_tweet_request: {
            auto_populate_reply_metadata: boolean,
            exclude_reply_user_ids: string[],
            media_ids: string[],
            status: string,
            thread_tweets: {
                media_ids: string[],
                status: string
            }[]
        }
    }>({
        url: gql('cH9HZWz_EW9gnswvA4ZRiQ/CreateDraftTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.tweet.rest_id as string),
    EditDraftTweet: new Endpoint<unknown, {
            draft_tweet_id: string,
            post_tweet_request: {
                auto_populate_reply_metadata: boolean,
                exclude_reply_user_ids: string[],
                media_ids: string[],
                status: string,
                thread_tweets: {
                    media_ids: string[],
                    status: string
                }[]
            }
        }>({
        url: gql('JIeXE-I6BZXHfxsgOkyHYQ/EditDraftTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.drafttweet_put === 'Done'),
    DeleteDraftTweet: new Endpoint<boolean, { draft_tweet_id: string }>({
        url: gql('bkh9G3FGgTldS9iTKWWYYw/DeleteDraftTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.drafttweet_delete === 'Done'),
    FetchDraftTweets: new Endpoint<DraftTweet[], { ascending: boolean }>({
        url: gql('ff5ciLFuifghdOtDoJj6Ww/FetchDraftTweets'),
        method: 'get'
    }, async (fmt, value) => (value.viewer.draft_list.response_data || []).map(parsers.draftTweet)),
    FetchScheduledTweets: new Endpoint<ScheduledTweet[], { ascending: boolean }>({
        url: gql('cmwoO7AWw5zCpd8TaPFQHg/FetchScheduledTweets'),
        method: 'get'
    }, async (fmt, value) => (value.viewer.scheduled_tweet_list || []).map(parsers.scheduledTweet)),
    TweetDetail: new Endpoint<Slice<TweetKind>, { focalTweetId: string, rankingMode: 'Relevance' | 'Recency' | 'Likes', cursor?: string }>({
        url: gql('97JF30KziU00483E_8elBA/TweetDetail'),
        method: 'get',
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.threaded_conversation_with_injections_v2.instructions)),
    TweetResultByRestId: new Endpoint<Tweet | TweetTombstone, { tweetId: string }>({
        url: gql('aFvUsJm2c-oDkJV75blV6g/TweetResultByRestId'),
        method: 'get',
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.tweet(value.data.tweetResult.result) as Tweet | TweetTombstone),
    TweetResultsByRestIds: new Endpoint<(Tweet | TweetTombstone)[], { tweetIds: string[] }>({
        url: gql('-R17e8UqwApFGdMxa3jASA/TweetResultsByRestIds'),
        method: 'get',
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline
    }, async (fmt, value) => value.data.tweetResult.map((tweet: any) => parsers.tweet(tweet?.result)) as (Tweet | TweetTombstone)[]),
    ModeratedTimeline: new Endpoint<Slice<TweetKind>, { rootTweetId: string, cursor?: string }>({
        url: gql('ftAt_EqbCL3YVp0VURo8iQ/ModeratedTimeline'),
        method: 'get',
        variables: {"count":40,"includePromotedContent":false},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.tweet.result.timeline_response.timeline.instructions)),
    Favoriters: new Endpoint<Slice<UserKind>, { tweetId: string, cursor?: string }>({
        url: gql('b3OrdeHDQfb9zRMC0fV3bw/Favoriters'),
        method: 'get',
        variables: {"count":40,"enableRanking":false,"includePromotedContent":false},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.favoriters_timeline.timeline.instructions)),
    Retweeters: new Endpoint<Slice<UserKind>, { tweetId: string, cursor?: string }>({
        url: gql('wfglZEC0MRgBdxMa_1a5YQ/Retweeters'),
        method: 'get',
        variables: {"count":40,"enableRanking":false,"includePromotedContent":false},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.retweeters_timeline.timeline.instructions)),
    FavoriteTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('ZYKSe-w7KEslx3JhSIk5LA/FavoriteTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.favorite_tweet === 'Done'),
    UnfavoriteTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('lI07N6Otwv1PhnEgXILM7A/UnfavoriteTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.unfavorite_tweet === 'Done'),
    CreateRetweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('LFho5rIi4xcKO90p9jwG7A/CreateRetweet'),
        method: 'post',
        variables: {"dark_request":false}
    }, async (fmt, value) => !!value.data.create_retweet?.retweet_results?.result?.rest_id),
    DeleteRetweet: new Endpoint<boolean, { source_tweet_id: string }>({
        url: gql('G4MoqBiE6aqyo4QWAgCy4w/DeleteRetweet'),
        method: 'post',
        variables: {"dark_request":false}
    }, async (fmt, value) => !!value.data.unretweet?.source_retweet_results?.result?.rest_id),
    ModerateTweet: new Endpoint<boolean, { tweetId: string }>({
        url: gql('pjFnHGVqCjTcZol0xcBJjw/ModerateTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.tweet_moderate_put === 'Done'),
    UnmoderateTweet: new Endpoint<boolean, { tweetId: string }>({
        url: gql('pVSyu6PA57TLvIE4nN2tsA/UnmoderateTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.tweet_unmoderate_put === 'Done'),
    PinTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('VIHsNu89pK-kW35JpHq7Xw/PinTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.pin_tweet?.message?.includes('success') as boolean),
    UnpinTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('BhKei844ypCyLYCg0nwigw/UnpinTweet'),
        method: 'post'
    }, async (fmt, value) => value.data.unpin_tweet?.message?.includes('success') as boolean),
    ConversationControlChange: new Endpoint<boolean, { tweet_id: string, mode: 'Community' | 'Verified' | 'ByInvitation' }>({
        url: gql('hb1elGcj6769uT8qVYqtjw/ConversationControlChange'),
        method: 'post'
    }, async (fmt, value) => value.data.tweet_conversation_control_put === 'Done'),
    ConversationControlDelete: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('OoMO_aSZ1ZXjegeamF9QmA/ConversationControlDelete'),
        method: 'post'
    }, async (fmt, value) => value.data.tweet_conversation_control_delete === 'Done'),
    UnmentionUserFromConversation: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('xVW9j3OqoBRY9d6_2OONEg/UnmentionUserFromConversation'),
        method: 'post'
    }, async (fmt, value) => value.data.unmention_user === 'Done'),
    mutes_conversations_create: new Endpoint<boolean, { tweet_id: string }>({
        url: v11('mutes/conversations/create.json'),
        method: 'post',
        token: OAUTH_KEY
    }, async (fmt, value) => !!value.id_str),
    mutes_conversations_destroy: new Endpoint<boolean, { tweet_id: string }>({
        url: v11('mutes/conversations/destroy.json'),
        method: 'post',
        token: OAUTH_KEY
    }, async (fmt, value) => !!value.id_str),
    cards_create: new Endpoint<string, { card_data: string }>({
        url: 'https://caps.twitter.com/v2/cards/create.json',
        method: 'post',
        requiresTransactionId: true
    }, async (fmt, value) => value.card_uri as string),
    capi_passthrough_1: new Endpoint<boolean, { 'twitter:string:card_uri': string, 'twitter:long:original_tweet_id': string, 'twitter:string:response_card_name'?: string, 'twitter:string:selected_choice': number }>({
        url: 'https://caps.twitter.com/v2/capi/passthrough/1',
        method: 'post',
        variables: { 'twitter:string:cards_platform': 'Web-12' },
        requiresTransactionId: true
    }, async (fmt, value) => !!value.card.url),
    media_upload: {
        init: new Endpoint<MediaUploadInit, {}>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'get',
            variables: {"command":"INIT"}
        }, async (fmt, value) => value as MediaUploadInit),
        append: new Endpoint<unknown, {}>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'post',
            variables: {"command":"APPEND"}
        }, async (fmt, value) => 0),
        finalize: new Endpoint<Media, {}>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'get',
            variables: {"command":"FINALIZE"}
        }, async (fmt, value) => parsers.mediaUpload(value)),
        status: new Endpoint<Media, {}>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'get',
            variables: {"command":"STATUS"}
        }, async (fmt, value) => parsers.mediaUpload(value)),
    },
    media_metadata_create: new Endpoint<boolean, { allow_download_status: { allow_download: `${boolean}` }, alt_text: { text: string }, media_id: string }>({
        url: v11('media/metadata/create.json'),
        method: 'post'
    }, async (fmt, value) => true),



    // USER
    UserByScreenName: new Endpoint<UserKind, { screen_name: string }>({
        url: gql('-oaLodhGbbnzJBACb1kk2Q/UserByScreenName'),
        method: 'get',
        features: flags.user
    }, async (fmt, value) => parsers.user(value.data.user.result)),
    UsersByScreenNames: new Endpoint<UserKind[], { screen_names: string[] }>({
        url: gql('ujL_oXbgVlDHQzWSTgzvnA/UsersByScreenNames'),
        method: 'get',
        features: flags.user
    }, async (fmt, value) => value.data.users.map((user: any) => parsers.user(user?.result))),
    UserByRestId: new Endpoint<UserKind, { userId: string }>({
        url: gql('Bbaot8ySMtJD7K2t01gW7A/UserByRestId'),
        method: 'get',
        features: flags.user
    }, async (fmt, value) => parsers.user(value.data.user.result)),
    UsersByRestIds: new Endpoint<UserKind[], { userIds: string[] }>({
        url: gql('xavgLWWbFH8wm_8MQN8plQ/UsersByRestIds'),
        method: 'get',
        features: flags.user
    }, async (fmt, value) => value.data.users.map((user: any) => parsers.user(user?.result)) as UserKind[]),
    AboutAccountQuery: new Endpoint<AboutUser, { screenName: string }>({
        url: gql('zs_jFPFT78rBpXv9Z3U2YQ/AboutAccountQuery'),
        method: 'get'
    }, async (fmt, value) => parsers.aboutUser(value.data.user_result_by_screen_name.result)),
    UserTweets: new Endpoint<Slice<TweetKind>, { userId: string, cursor?: string }>({
        url: gql('-V26I6Pb5xDZ3C7BWwCQ_Q/UserTweets'),
        method: 'get',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)),
    UserTweetsAndReplies: new Endpoint<Slice<TweetKind>, { userId: string, cursor?: string }>({
        url: gql('61HQnvcGP870hiE-hCbG4A/UserTweetsAndReplies'),
        method: 'get',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)),
    UserMedia: new Endpoint<Slice<TweetKind>, { userId: string, cursor?: string }>({
        url: gql('MMnr49cP_nldzCTfeVDRtA/UserMedia'),
        method: 'get',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.mediaEntries(value.data.user.result.timeline.timeline.instructions)),
    Likes: new Endpoint<Slice<TweetKind>, { userId: string, cursor?: string }>({
        url: gql('JR2gceKucIKcVNB_9JkhsA/Likes'),
        method: 'get',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)),
    UserHighlightsTweets: new Endpoint<Slice<TweetKind>, { userId: string, cursor?: string }>({
        url: gql('QzHVmkiRhEfSMY_BRkxFRQ/UserHighlightsTweets'),
        method: 'get',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)),
    UserSuperFollowTweets: new Endpoint<Slice<TweetKind>, { userId: string, cursor?: string }>({
        url: gql('toCUR18_0OFliE5VXqwHfg/UserSuperFollowTweets'),
        method: 'get',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)),
    Following: new Endpoint<Slice<UserKind>, { userId: string, cursor?: string }>({
        url: gql('BEkNpEt5pNETESoqMsTEGA/Following'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN
    }, async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)),
    Followers: new Endpoint<Slice<UserKind>, { userId: string, cursor?: string }>({
        url: gql('kuFUYP9eV1FPoEy4N-pi7w/Followers'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN
    }, async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)),
    FollowersYouKnow: new Endpoint<Slice<UserKind>, { userId: string, cursor?: string }>({
        url: gql('G3jEqceFeMKS559RiF4UDw/FollowersYouKnow'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN
    }, async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)),
    BlueVerifiedFollowers: new Endpoint<Slice<UserKind>, { userId: string, cursor?: string }>({
        url: gql('8a7QJe2CCHf4AWcs-1P6KQ/BlueVerifiedFollowers'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: OAUTH_KEY
    }, async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)),
    UserCreatorSubscriptions: new Endpoint<Slice<UserKind>, { userId: string, cursor?: string }>({
        url: gql('fl06vhYypYRcRxgLKO011Q/UserCreatorSubscriptions'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)),
    UserCreatorSubscribers: new Endpoint<Slice<UserKind>, { userId: string, cursor?: string }>({
        url: gql('0X21EWewnvqLxCWZwWrnpg/UserCreatorSubscribers'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)),
    UserBusinessProfileTeamTimeline: new Endpoint<Slice<UserKind>, { userId: string, teamName: string, cursor?: string }>({
        url: gql('KFaAofDlKP7bnzskNWmjwA/UserBusinessProfileTeamTimeline'),
        method: 'get',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline
    }, async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)),
    RemoveFollower: new Endpoint<boolean, { target_user_id: string }>({
        url: gql('QpNfg0kpPRfjROQ_9eOLXA/RemoveFollower'),
        method: 'post'
    }, async (fmt, value) => value.data.remove_follower?.unfollow_success_reason === 'Unfollowed'),
    friendships_create: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/create.json'),
        method: 'post',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1},
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.id_str),
    friendships_destroy: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/destroy.json'),
        method: 'post',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1},
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.id_str),
    friendships_update: new Endpoint<boolean, { id: string, retweets?: boolean, device?: boolean }>({
        url: v11('friendships/update.json'),
        method: 'post',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"cursor":-1},
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.relationship.target.id_str),
    friendships_cancel: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/cancel.json'),
        method: 'post',
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.id_str),
    friendships_incoming: new Endpoint<{ ids: string[], next_cursor_str: string, previous_cursor_str: string }, { cursor: number }>({
        url: v11('friendships/incoming.json'),
        method: 'get',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"stringify_ids":true,"count":100},
        token: ALT_TOKEN
    }, async (fmt, value) => value as { ids: string[], next_cursor_str: string, previous_cursor_str: string }),
    friendships_accept: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/accept.json'),
        method: 'post',
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.id_str),
    friendships_deny: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/deny.json'),
        method: 'post',
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.id_str),
    blocks_create: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('blocks/create.json', false),
        method: 'post',
        requiresTransactionId: true
    }, async (fmt, value) => !!value.id_str),
    blocks_destroy: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('blocks/destroy.json', false),
        method: 'post',
        requiresTransactionId: true
    }, async (fmt, value) => !!value.id_str),
    mutes_users_create: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('mutes/users/create.json'),
        method: 'post',
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.id_str),
    mutes_users_destroy: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('mutes/users/destroy.json'),
        method: 'post',
        token: ALT_TOKEN
    }, async (fmt, value) => !!value.id_str),
} as const satisfies Record<string, Endpoint | EndpointGroup>;
