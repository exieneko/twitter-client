import * as flags from './flags.js';
import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag, List, MediaUploadInit, Slice, Tweet, TweetTombstone, TwitterResponse, UnavailableUser, User } from './types/index.js';
import type { Endpoint } from './types/internal.js';
import * as parsers from './types/parsers.js';
import { gql, v11 } from './utils/index.js';

export const PUBLIC_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
export const ALT_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F';
export const OAUTH_KEY = 'Bearer AAAAAAAAAAAAAAAAAAAAAG5LOQEAAAAAbEKsIYYIhrfOQqm4H8u7xcahRkU%3Dz98HKmzbeXdKqBfUDmElcqYl0cmmKY9KdS2UoNIz3Phapgsowi';

export const MAX_ACCEPTABLE_REQUEST_TIME = 1000;
export const MAX_TIMELINE_ITERATIONS = 5;
export const TWEET_CHARACTER_LIMIT = 280;

export const EMPTY_SLICE: TwitterResponse<Slice<any>> = {
    errors: [],
    data: {
        entries: [],
        cursors: {}
    }
};

export const HEADERS = {
    Accept: '*/*',
    Connection: 'keep-alive',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session'
};

// all graphql query ids last updated on 2026-01-02
export const ENDPOINTS = {
    // ACCOUNT
    BlockedAccountsAll: {
        url: gql('cViKW5oZPiIce0MOSKYblw/BlockedAccountsAll'),
        method: 'GET',
        params: {} as { cursor?: string },
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.viewer.timeline.timeline.instructions)
    },
    BlockedAccountsImported: {
        url: gql('CJ8VCYGYHBNu2Dq2AdgO2w/BlockedAccountsImported'),
        method: 'GET',
        params: {} as { cursor?: string },
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.viewer.timeline.timeline.instructions)
    },
    MutedAccounts: {
        url: gql('mJA1YbOoJTyoB64W9hd6ZQ/MutedAccounts'),
        method: 'GET',
        params: {} as { cursor?: string },
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.viewer.muting_timeline.timeline.instructions)
    },
    account_settings: {
        url: v11('account/settings.json'),
        method: 'GET',
        variables: {"include_ext_sharing_audiospaces_listening_data_with_followers":true,"include_mention_filter":true,"include_nsfw_user_flag":true,"include_nsfw_admin_flag":true,"include_ranked_timeline":true,"include_alt_text_compose":true,"include_ext_dm_av_call_settings":true,"ext":"ssoConnections","include_country_code":true,"include_ext_dm_nsfw_media_filter":true},
        requiresTransactionId: true,
        format: async (fmt, value) => parsers.settings(value)
    },
    account_update_profile: {
        url: v11('account/update_profile.json'),
        method: 'POST',
        params: {} as {
            birthdate_day: number,
            birthdate_month: number,
            birthdate_year: number,
            birthdate_visibility: 'self' | 'followers' | 'following' | 'mutualfollow' | 'public',
            birthdate_year_visibility: 'self' | 'followers' | 'following' | 'mutualfollow' | 'public',
            url: string,
            name: string,
            description: string,
            location: string
        },
        variables: {"displayNameMaxLength":50},
        requiresTransactionId: true,
        format: async (fmt, value) => !!value.id_str
    },
    account_update_profile_image: {
        url: v11('account/update_profile_image.json'),
        method: 'POST',
        params: {} as { media_id: string },
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"return_user":true},
        requiresTransactionId: true,
        format: async (fmt, value) => !!value.id_str
    },
    account_verify_credentials: {
        url: v11('account/verify_credentials.json'),
        method: 'GET',
        requiresTransactionId: true,
        format: async (fmt, value) => parsers.userLegacy(value)
    },



    // BIRDWATCH
    BirdwatchFetchGlobalTimeline: {
        url: gql('rG-k-eTUj0YhAqXkSNJbiQ/BirdwatchFetchGlobalTimeline'),
        method: 'GET',
        features: flags.timeline,
        format: async (fmt, value) => parsers.birdwatch(value.data.viewer.birdwatch_home_page)
    },
    BirdwatchFetchNotes: {
        url: gql('dG85JgBxwnAt_PYNZTyvTg/BirdwatchFetchNotes'),
        method: 'GET',
        params: {} as { tweet_id: string },
        features: flags.birdwatch,
        format: async (fmt, value) => parsers.birdwatchTweet(value.data.tweet_result_by_rest_id.result)
    },
    BirdwatchFetchBirdwatchProfile: {
        url: gql('id9iGfEQF47W1kvRBHUmRQ/BirdwatchFetchBirdwatchProfile'),
        method: 'GET',
        params: {} as { alias: string },
        features: { responsive_web_birdwatch_top_contributor_enabled: true },
        format: async (fmt, value) => parsers.birdwatchUser(value.data.birdwatch_profile_by_alias, false)
    },
    BirdwatchCreateRating: {
        url: gql('gbshFt1Vmddrlio4vHWhhQ/BirdwatchCreateRating'),
        method: 'POST',
        params: {} as {
            data_v2: {
                helpful_tags?: BirdwatchHelpfulTag[],
                not_helpful_tags?: BirdwatchUnhelpfulTag[],
                helpfulness_level: 'Helpful' | 'SomewhatHelpful' | 'NotHelpful'
            },
            note_id: string,
            rating_source: 'BirdwatchForYouTimeline' | 'BirdwatchHomeNeedsYourHelp',
            source_platform: 'BirdwatchWeb',
            tweet_id: string
        },
        format: async (fmt, value) => value.data.birdwatchnote_rate_v3?.__typename === 'BirdwatchNoteRating'
    },
    BirdwatchDeleteRating: {
        url: gql('OpvCOyOoQClUND66zDzrnA/BirdwatchDeleteRating'),
        method: 'POST',
        params: {} as { note_id: string },
        format: async (fmt, value) => value.data.birdwatchnote_rating_delete === 'Done'
    },



    // BOOKMARKS
    Bookmarks: {
        url: gql('E6jlrZG4703s0mcA9DfNKQ/Bookmarks'),
        method: 'GET',
        params: {} as { cursor?: string },
        variables: {"count":50,"includePromotedContent":false},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.bookmark_timeline_v2.timeline.instructions)
    },
    BookmarkSearchTimeline: {
        url: gql('9467z_eRSDs6mi8CHRLxnA/BookmarkSearchTimeline'),
        method: 'GET',
        params: {} as { rawQuery: string, cursor?: string },
        variables: {"count":50},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.search_by_raw_query.bookmarks_search_timeline.timeline.instructions)
    },
    CreateBookmark: {
        url: gql('aoDbu3RHznuiSkQ9aNM67Q/CreateBookmark'),
        method: 'POST',
        params: {} as { tweet_id: string },
        token: OAUTH_KEY,
        format: async (fmt, value) => value.data.tweet_bookmark_put === 'Done'
    },
    DeleteBookmark: {
        url: gql('Wlmlj2-xzyS1GN3a6cj-mQ/DeleteBookmark'),
        method: 'POST',
        params: {} as { tweet_id: string },
        token: OAUTH_KEY,
        format: async (fmt, value) => value.data.tweet_bookmark_delete === 'Done'
    },
    BookmarksAllDelete: {
        url: gql('skiACZKC1GDYli-M8RzEPQ/BookmarksAllDelete'),
        method: 'POST',
        token: OAUTH_KEY,
        format: async (fmt, value) => value.data.bookmark_all_delete === 'Done'
    },



    // COMMUNITY
    CommunityByRestId: {
        url: gql('iO-Ycgd1CdS0xk9nQYMCaA/CommunityByRestId'),
        method: 'GET',
        params: {} as { communityId: string },
        features: flags.short,
        format: async (fmt, value) => parsers.community(value.data.communityResults.result)
    },
    CommunityTweetsTimeline: {
        url: gql('ZoPkicnDp0_M60vVsWxf7w/CommunityTweetsTimeline'),
        method: 'GET',
        params: {} as { communityId: string, rankingMode: 'Relevance' | 'Recency', cursor?: string },
        variables: {"count":20,"displayLocation":"Community","withCommunity":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.communityResults.result.ranked_community_timeline.timeline.instructions)
    },
    CommunityMediaTimeline: {
        url: gql('_DJU-HFPmQZX0_nclxm0Qg/CommunityMediaTimeline'),
        method: 'GET',
        params: {} as { communityId: string, cursor?: string },
        variables: {"count":20,"displayLocation":"Community","withCommunity":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.mediaEntries(value.data.communityResults.result.ranked_community_timeline.timeline.instructions, {
            content: value.data.communityResults.result.ranked_community_timeline.timeline.instructions.find((i: any) => i.type === 'TimelineAddToModule'),
            key: 'moduleItems'
        })
    },
    JoinCommunity: {
        url: gql('b9bfcMQtJqWWCoyuM91Cpw/JoinCommunity'),
        method: 'GET',
        params: {} as { communityId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.community_join.id_str
    },
    LeaveCommunity: {
        url: gql('LLQ-xxy7KYe7VJFtRO31ig/LeaveCommunity'),
        method: 'GET',
        params: {} as { communityId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.community_leave.id_str
    },



    // DISCOVER
    ExplorePage: {
        url: 'r-XJpn_t210wJmpV9qnAHg/ExplorePage',
        method: 'GET',
        params: {} as { cursor: string },
        features: flags.timeline,
        format: async (fmt, value) => parsers.discoverEntries(value.data.explore_page.body)
    },
    ExploreSidebar: {
        url: 'FrpzJjnhtQSrL4txK29E7A/ExploreSidebar',
        method: 'GET',
        features: flags.timeline,
        format: async (fmt, value) => parsers.trendEntries(value.data.explore_sidebar.timeline.instructions)
    },



    // LIST
    ListByRestId: {
        url: gql('Tzkkg-NaBi_y1aAUUb6_eQ/ListByRestId'),
        method: 'GET',
        params: {} as { listId: string },
        features: flags.short,
        format: async (fmt, value) => parsers.list(value.data.list)
    },
    ListBySlug: {
        url: gql('kPoa5ip1Zl3rYF0T-e2HcA/ListBySlug'),
        method: 'GET',
        params: {} as { listId: string },
        features: flags.short,
        format: async (fmt, value) => parsers.list(value.data.list)
    },
    ListLatestTweetsTimeline: {
        url: gql('fqNUs_6rqLf89u_2waWuqg/ListLatestTweetsTimeline'),
        method: 'GET',
        params: {} as { listId: string, cursor?: string },
        variables: {"count":40},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.list.tweets_timeline.timeline.instructions)
    },
    /** @todo */
    ListsManagementPageTimeline: {
        url: gql('mjBb_n_f5Ci-eIysajMRWQ/ListsManagementPageTimeline'),
        method: 'GET',
        variables: {"count":100},
        features: flags.timeline,
        format: async (fmt, value) => value
    },
    ListsDiscovery: {
        url: gql('WcZy_1yhZQ5zOabw_WElww/ListsDiscovery'),
        method: 'GET',
        variables: {"count":40},
        features: flags.timeline,
        format: async (fmt, value) => parsers.listEntries(value.data.list_discovery_list_mixer_timeline.timeline.instructions)
    },
    ListMemberships: {
        url: gql('X6U9LAaMZ5C8MvPM12aK2A/ListMemberships'),
        method: 'GET',
        params: {} as { cursor?: string },
        variables: {"count":20},
        features: flags.timeline,
        format: async (fmt, value) => parsers.listEntries(value.data.user.result.timeline.instructions)
    },
    ListOwnerships: {
        url: gql('k0_MqdZDcbfRtDVuuk2Dig/ListOwnerships'),
        method: 'GET',
        params: {} as { userId: string, isListMemberTargetUserId: string, cursor?: string },
        variables: {"count":20},
        features: flags.timeline,
        format: async (fmt, value) => parsers.listEntries(value.data.user.result.timeline.instructions)
    },
    ListMembers: {
        url: gql('Bnhcen0kdsMAU1tW7U79qQ/ListMembers'),
        method: 'GET',
        params: {} as { listId: string, cursor?: string },
        variables: {"count":40},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.list.members_timeline.timeline.instructions)
    },
    ListSubscribers: {
        url: gql('5EDvteYto4oDpMVpPG1cPw/ListSubscribers'),
        method: 'GET',
        params: {} as { listId: string, cursor?: string },
        variables: {"count":40},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.list.subscribers_timeline.timeline.instructions)
    },
    ListCreationRecommendedUsers: {
        url: gql('nD2vOulHcOJhgSQH5ICIIg/ListCreationRecommendedUsers'),
        method: 'GET',
        params: {} as { listId: string, cursor?: string },
        variables: {"count":20},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.list.recommended_users.timeline.instructions)
    },
    ListEditRecommendedUsers: {
        url: gql('lEEGoONAojgrJ1oXe3yoUA/ListEditRecommendedUsers'),
        method: 'GET',
        params: {} as { listId: string, cursor?: string },
        variables: {"count":20},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.list.recommended_users.timeline.instructions)
    },
    CombinedLists: {
        url: gql('NFidCm38TCj56xu-yOqOXA/CombinedLists'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":100},
        features: flags.timeline,
        format: async (fmt, value) => parsers.listEntries(value.data.user.result.timeline.timeline.instructions)
    },
    CreateList: {
        url: gql('CzrvV0ePRFW1dPgLY6an7g/CreateList'),
        method: 'POST',
        params: {} as { name: string, description: string, isPrivate: boolean },
        features: flags.short,
        format: async (fmt, value) => parsers.list(value.list) as List
    },
    DeleteList: {
        url: gql('UnN9Th1BDbeLjpgjGSpL3Q/DeleteList'),
        method: 'POST',
        params: {} as { listId: string },
        format: async (fmt, value) => value.list_delete === 'Done'
    },
    UpdateList: {
        url: gql('CToNDwmbHSq5tqV0ExBFeg/UpdateList'),
        method: 'POST',
        params: {} as { listId: string, name: string, description: string, isPrivate: boolean },
        format: async (fmt, value) => !!value.data.list.id_str
    },
    EditListBanner: {
        url: gql('CChy7omMr21Rx5xgqzTDeA/EditListBanner'),
        method: 'POST',
        params: {} as { listId: string, mediaId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.list.id_str
    },
    DeleteListBanner: {
        url: gql('uT6t6CXdWqMF9UBPaQgxjw/DeleteListBanner'),
        method: 'POST',
        params: {} as { listId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.list.id_str
    },
    ListAddMember: {
        url: gql('EadD8ivrhZhYQr2pDmCpjA/ListAddMember'),
        method: 'POST',
        params: {} as { listId: string, userId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.list.id_str
    },
    ListRemoveMember: {
        url: gql('B5tMzrMYuFHJex_4EXFTSw/ListRemoveMember'),
        method: 'POST',
        params: {} as { listId: string, userId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.list.id_str
    },
    ListSubscribe: {
        url: gql('qItCdxZic3vKHuF2nwO5cg/ListSubscribe'),
        method: 'POST',
        params: {} as { listId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.list_subscribe_v3.id_str
    },
    ListUnsubscribe: {
        url: gql('lJyQ2Rp6vk4h5czTYqOeLA/ListUnsubscribe'),
        method: 'POST',
        params: {} as { listId: string },
        features: flags.short,
        format: async (fmt, value) => !!value.data.list.id_str
    },
    PinTimeline: {
        url: gql('y62a1ZmM0tI0kjTj4j8-LA/PinTimeline'),
        method: 'POST',
        params: {} as { pinnedTimelineItem: { id: string, pinned_timeline_type: 'List' } },
        features: flags.short,
        format: async (fmt, value) => !!value.data.pin_timeline.updated_pinned_timeline.list.id_str
    },
    UnpinTimeline: {
        url: gql('_flfMJhBPURJJLxAuIFAfw/UnpinTimeline'),
        method: 'POST',
        params: {} as { pinnedTimelineItem: { id: string, pinned_timeline_type: 'List' } },
        features: flags.short,
        format: async (fmt, value) => !!value.data.unpin_timeline.updated_pinned_timeline.list.id_str
    },
    MuteList: {
        url: gql('ZYyanJsskNUcltu9bliMLA/MuteList'),
        method: 'POST',
        params: {} as { listId: string },
        format: async (fmt, value) => value.data.list === 'Done'
    },
    UnmuteList: {
        url: gql('pMZrHRNsmEkXgbn3tOyr7Q/UnmuteList'),
        method: 'POST',
        params: {} as { listId: string },
        format: async (fmt, value) => value.data.list === 'Done'
    },



    // NOTIFICATIONS
    NotificationsTimeline: {
        url: gql('Ev6UMJRROInk_RMH2oVbBg/NotificationsTimeline'),
        method: 'GET',
        params: {} as { timeline_type: 'All' | 'Verified' | 'Mentions', cursor?: string },
        variables: {"count":40},
        features: flags.timeline,
        format: async (fmt, value) => parsers.notificationEntries(value.data.viewer_v2.user_results.result.notification_timeline.timeline.instructions)
    },
    badge_count: {
        url: 'https://twitter.com/i/api/2/badge_count/badge_count.json',
        method: 'GET',
        variables: {"supports_ntab_urt":1,"include_xchat_count":1},
        format: async (fmt, value) => parsers.unreadCount(value)
    },
    last_seen_cursor: {
        url: 'https://twitter.com/i/api/2/notifications/all/last_seen_cursor.json',
        method: 'POST',
        params: {} as { cursor: string },
        format: async (fmt, value) => value.cursor
    },
    device_follow: {
        url: 'https://twitter.com/i/api/2/notifications/device_follow.json',
        method: 'GET',
        params: {} as { cursor?: string },
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_has_nft_avatar":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"cards_platform":"Web-12","include_cards":1,"include_ext_alt_text":true,"include_ext_limited_action_results":true,"include_quote_count":true,"include_reply_count":1,"tweet_mode":"extended","include_ext_views":true,"include_entities":true,"include_user_entities":true,"include_ext_media_color":true,"include_ext_media_availability":true,"include_ext_sensitive_media_warning":true,"include_ext_trusted_friends_metadata":true,"send_error_codes":true,"simple_quoted_tweet":true,"count":20,"requestContext":"launch","ext":"mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CbirdwatchPivot%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl"},
        format: async (fmt, value) => parsers.deviceFollowEntries(
            (Object.entries(value.timeline.instructions).find(([, v]: [any, any]) => Object.entries(v).at(0)?.at(0) === 'addEntries')?.at(1) as any)?.addEntries?.entries || [],
            value.globalObjects
        )
    },



    // SEARCH
    SearchTimeline: {
        url: gql('M1jEez78PEfVfbQLvlWMvQ/SearchTimeline'),
        method: 'GET',
        params: {} as { rawQuery: string, querySource: 'typed_query' | 'recent_search_click' | 'tdqt', product: 'Top' | 'Latest' | 'People' | 'Media' | 'Lists', cursor?: string },
        variables: {"count":40},
        features: flags.timeline,
        token: ALT_TOKEN,
        format: async (fmt, value) => parsers.searchEntries(value.data.search_by_raw_query.search_timeline.timeline.instructions)
    },
    search_typeahead: {
        url: v11('search/typeahead.json'),
        method: 'GET',
        params: {} as { q: string },
        variables: {"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"src":"search_box","result_type":"events,users,topics,lists"},
        format: async (fmt, value) => parsers.typeahead(value)
    },



    // TIMELINE
    HomeLatestTimeline: {
        url: gql('_qO7FJzShSKYWi9gtboE6A/HomeLatestTimeline'),
        method: 'GET',
        params: {} as { seenTweetIds: string[], requestContext?: 'launch', cursor?: string },
        variables: {"count":20,"includePromotedContent":false,"latestControlAvailable":true,"withCommunity":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.home.home_timeline_urt.instructions)
    },
    HomeTimeline: {
        url: gql('V7xdnRnvW6a8vIsMr9xK7A/HomeTimeline'),
        method: 'GET',
        params: {} as { seenTweetIds: string[], requestContext?: 'launch', cursor?: string },
        variables: {"count":20,"includePromotedContent":false,"latestControlAvailable":true,"withCommunity":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.home.home_timeline_urt.instructions)
    },
    GenericTimelineById: {
        url: gql('8Ncv6o18kamVfavnfvrSTA/GenericTimelineById'),
        method: 'GET',
        params: {} as { timelineId: string, cursor?: string },
        variables: {"count":20,"withQuickPromoteEligibilityTweetFields":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.timeline.timeline.instructions)
    },
    GenericTimelineById_TRENDS: {
        url: gql('8Ncv6o18kamVfavnfvrSTA/GenericTimelineById'),
        method: 'GET',
        params: {} as { timelineId: string, cursor?: string },
        variables: {"count":20,"withQuickPromoteEligibilityTweetFields":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.trendEntries(value.data.timeline.timeline.instructions)
    },



    // TWEET
    CreateTweet: {
        url: gql('Uf3io9zVp1DsYxrmL5FJ7g/CreateTweet'),
        method: 'POST',
        params: {} as {
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
        },
        variables: {"dark_request":false,"disallowed_reply_options":null},
        features: flags.timeline,
        requiresTransactionId: true,
        format: async (fmt, value) => parsers.tweet(value.data.create_tweet?.tweet_results?.result) as Tweet
    },
    CreateNoteTweet: {
        url: gql('lPTBLb_FPA5r8z_cH-s8lw/CreateNoteTweet'),
        method: 'POST',
        params: {} as {
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
        },
        features: flags.timeline,
        format: async (fmt, value) => parsers.tweet(value.data.notetweet_create?.tweet_results?.result) as Tweet
    },
    DeleteTweet: {
        url: gql('VaenaVgh5q5ih7kvyVjgtg/DeleteTweet'),
        method: 'POST',
        params: {} as { tweet_id: string },
        variables: {"dark_request":false},
        format: async (fmt, value) => !!value.delete_tweet
    },
    CreateScheduledTweet: {
        url: gql('LCVzRQGxOaGnOnYH01NQXg/CreateScheduledTweet'),
        method: 'POST',
        params: {} as {
            execute_at: number,
            post_tweet_request: {
                auto_populate_reply_metadata: boolean,
                exclude_reply_user_ids: string[],
                media_ids: string[],
                status: string
            }
        },
        format: async (fmt, value) => value.data.tweet?.rest_id as string
    },
    EditScheduledTweet: {
        url: gql('_mHkQ5LHpRRjSXKOcG6eZw/EditScheduledTweet'),
        method: 'POST',
        params: {} as {
            execute_at: number,
            post_tweet_request: {
                auto_populate_reply_metadata: boolean,
                exclude_reply_user_ids: string[],
                media_ids: string[],
                status: string
            },
            scheduled_tweet_id: string
        },
        format: async (fmt, value) => value.data.scheduledtweet_put === 'Done'
    },
    DeleteScheduledTweet: {
        url: gql('CTOVqej0JBXAZSwkp1US0g/DeleteScheduledTweet'),
        method: 'POST',
        params: {} as { scheduled_tweet_id: string },
        format: async (fmt, value) => value.data.scheduledtweet_delete === 'Done'
    },
    CreateDraftTweet: {
        url: gql('cH9HZWz_EW9gnswvA4ZRiQ/CreateDraftTweet'),
        method: 'POST',
        params: {} as {
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
        },
        format: async (fmt, value) => value.data.tweet.rest_id
    },
    EditDraftTweet: {
        url: gql('JIeXE-I6BZXHfxsgOkyHYQ/EditDraftTweet'),
        method: 'POST',
        params: {} as {
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
        },
        format: async (fmt, value) => value.data.drafttweet_put === 'Done'
    },
    DeleteDraftTweet: {
        url: gql('bkh9G3FGgTldS9iTKWWYYw/DeleteDraftTweet'),
        method: 'POST',
        params: {} as { draft_tweet_id: string },
        format: async (fmt, value) => value.data.drafttweet_delete === 'Done'
    },
    FetchDraftTweets: {
        url: gql('ff5ciLFuifghdOtDoJj6Ww/FetchDraftTweets'),
        method: 'GET',
        params: {} as { ascending: boolean },
        format: async (fmt, value) => (value.viewer.draft_list.response_data || []).map(parsers.draftTweet)
    },
    FetchScheduledTweets: {
        url: gql('cmwoO7AWw5zCpd8TaPFQHg/FetchScheduledTweets'),
        method: 'GET',
        params: {} as { ascending: boolean },
        format: async (fmt, value) => (value.viewer.scheduled_tweet_list || []).map(parsers.scheduledTweet)
    },
    TweetDetail: {
        url: gql('97JF30KziU00483E_8elBA/TweetDetail'),
        method: 'GET',
        params: {} as { focalTweetId: string, rankingMode: 'Relevance' | 'Recency' | 'Likes', cursor?: string },
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.threaded_conversation_with_injections_v2.instructions)
    },
    TweetResultByRestId: {
        url: gql('aFvUsJm2c-oDkJV75blV6g/TweetResultByRestId'),
        method: 'GET',
        params: {} as { tweetId: string },
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.tweet(value.data.tweetResult.result) as Tweet | TweetTombstone
    },
    TweetResultsByRestIds: {
        url: gql('-R17e8UqwApFGdMxa3jASA/TweetResultsByRestIds'),
        method: 'GET',
        params: {} as { tweetIds: string[] },
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline,
        format: async (fmt, value) => value.data.tweetResult.map((tweet: any) => parsers.tweet(tweet?.result)) as Tweet | TweetTombstone[]
    },
    ModeratedTimeline: {
        url: gql('ftAt_EqbCL3YVp0VURo8iQ/ModeratedTimeline'),
        method: 'GET',
        params: {} as { rootTweetId: string, cursor?: string },
        variables: {"count":40,"includePromotedContent":false},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.tweet.result.timeline_response.timeline.instructions)
    },
    Favoriters: {
        url: gql('b3OrdeHDQfb9zRMC0fV3bw/Favoriters'),
        method: 'GET',
        params: {} as { tweetId: string, cursor?: string },
        variables: {"count":40,"enableRanking":false,"includePromotedContent":false},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.favoriters_timeline.timeline.instructions)
    },
    Retweeters: {
        url: gql('wfglZEC0MRgBdxMa_1a5YQ/Retweeters'),
        method: 'GET',
        params: {} as { tweetId: string, cursor?: string },
        variables: {"count":40,"enableRanking":false,"includePromotedContent":false},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.retweeters_timeline.timeline.instructions)
    },
    FavoriteTweet: {
        url: gql('ZYKSe-w7KEslx3JhSIk5LA/FavoriteTweet'),
        method: 'POST',
        params: {} as { tweet_id: string },
        format: async (fmt, value) => value.data.favorite_tweet === 'Done'
    },
    UnfavoriteTweet: {
        url: gql('lI07N6Otwv1PhnEgXILM7A/UnfavoriteTweet'),
        method: 'POST',
        params: {} as { tweet_id: string },
        format: async (fmt, value) => value.data.unfavorite_tweet === 'Done'
    },
    CreateRetweet: {
        url: gql('LFho5rIi4xcKO90p9jwG7A/CreateRetweet'),
        method: 'POST',
        params: {} as { tweet_id: string },
        variables: {"dark_request":false},
        format: async (fmt, value) => !!value.data.create_retweet?.retweet_results?.result?.rest_id
    },
    DeleteRetweet: {
        url: gql('G4MoqBiE6aqyo4QWAgCy4w/DeleteRetweet'),
        method: 'POST',
        params: {} as { source_tweet_id: string },
        variables: {"dark_request":false},
        format: async (fmt, value) => !!value.data.unretweet?.source_retweet_results?.result?.rest_id
    },
    ModerateTweet: {
        url: gql('pjFnHGVqCjTcZol0xcBJjw/ModerateTweet'),
        method: 'POST',
        params: {} as { tweetId: string },
        format: async (fmt, value) => value.data.tweet_moderate_put === 'Done'
    },
    UnmoderateTweet: {
        url: gql('pVSyu6PA57TLvIE4nN2tsA/UnmoderateTweet'),
        method: 'POST',
        params: {} as { tweetId: string },
        format: async (fmt, value) => value.data.tweet_unmoderate_put === 'Done'
    },
    PinTweet: {
        url: gql('VIHsNu89pK-kW35JpHq7Xw/PinTweet'),
        method: 'POST',
        params: {} as { tweet_id: string },
        format: async (fmt, value) => value.data.pin_tweet?.message?.includes('success') as boolean
    },
    UnpinTweet: {
        url: gql('BhKei844ypCyLYCg0nwigw/UnpinTweet'),
        method: 'POST',
        params: {} as { tweet_id: string },
        format: async (fmt, value) => value.data.unpin_tweet?.message?.includes('success') as boolean
    },
    ConversationControlChange: {
        url: gql('hb1elGcj6769uT8qVYqtjw/ConversationControlChange'),
        method: 'POST',
        params: {} as { tweet_id: string, mode: 'Community' | 'Verified' | 'ByInvitation' },
        format: async (fmt, value) => value.data.tweet_conversation_control_put === 'Done'
    },
    ConversationControlDelete: {
        url: gql('OoMO_aSZ1ZXjegeamF9QmA/ConversationControlDelete'),
        method: 'POST',
        params: {} as { tweet_id: string },
        format: async (fmt, value) => value.data.tweet_conversation_control_delete === 'Done'
    },
    UnmentionUserFromConversation: {
        url: gql('xVW9j3OqoBRY9d6_2OONEg/UnmentionUserFromConversation'),
        method: 'POST',
        params: {} as { tweet_id: string },
        format: async (fmt, value) => value.data.unmention_user === 'Done'
    },
    mutes_conversations_create: {
        url: v11('mutes/conversations/create.json'),
        method: 'POST',
        params: {} as { tweet_id: string },
        token: OAUTH_KEY,
        format: async (fmt, value) => !!value.id_str
    },
    mutes_conversations_destroy: {
        url: v11('mutes/conversations/destroy.json'),
        method: 'POST',
        params: {} as { tweet_id: string },
        token: OAUTH_KEY,
        format: async (fmt, value) => !!value.id_str
    },
    cards_create: {
        url: 'https://caps.twitter.com/v2/cards/create.json',
        method: 'POST',
        params: {} as { card_data: string },
        requiresTransactionId: true,
        format: async (fmt, value) => value.card_uri as string
    },
    capi_passthrough_1: {
        url: 'https://caps.twitter.com/v2/capi/passthrough/1',
        method: 'POST',
        params: {} as { 'twitter:string:card_uri': string, 'twitter:long:original_tweet_id': string, 'twitter:string:response_card_name'?: string, 'twitter:string:selected_choice': number },
        variables: { 'twitter:string:cards_platform': 'Web-12' },
        requiresTransactionId: true,
        format: async (fmt, value) => !!value.card.url
    },
    media_upload_INIT: {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        method: 'GET',
        variables: {"command":"INIT"},
        params: {} as { total_bytes: string, media_type: string, media_category: 'tweet_image' | 'tweet_gif' | 'tweet_video' },
        format: async (fmt, value) => value as MediaUploadInit
    },
    media_upload_FINALIZE: {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        method: 'GET',
        variables: {"command":"FINALIZE"},
        params: {} as { media_id: string },
        format: async (fmt, value) => parsers.mediaUpload(value)
    },
    media_upload_STATUS: {
        url: 'https://upload.twitter.com/1.1/media/upload.json',
        method: 'GET',
        variables: {"command":"STATUS"},
        params: {} as { media_id: string },
        format: async (fmt, value) => parsers.mediaUpload(value)
    },
    media_metadata_create: {
        url: v11('media/metadata/create.json'),
        method: 'POST',
        params: {} as { allow_download_status: { allow_download: `${boolean}` }, alt_text: { text: string }, media_id: string },
        format: async (fmt, value) => true
    },



    // USER
    UserByScreenName: {
        url: gql('-oaLodhGbbnzJBACb1kk2Q/UserByScreenName'),
        method: 'GET',
        params: {} as { screen_name: string },
        features: flags.user,
        // format: async (fmt, value) => parsers.user(value.data.user.result)
        format: async (fmt, value) => parsers.user(value.data.user.result)
    },
    UsersByScreenNames: {
        url: gql('ujL_oXbgVlDHQzWSTgzvnA/UsersByScreenNames'),
        method: 'GET',
        params: {} as { screen_names: string[] },
        features: flags.user,
        format: async (fmt, value) => value.data.users.map((user: any) => parsers.user(user?.result)) as (User | UnavailableUser)[]
    },
    UserByRestId: {
        url: gql('Bbaot8ySMtJD7K2t01gW7A/UserByRestId'),
        method: 'GET',
        params: {} as { userId: string },
        features: flags.user,
        format: async (fmt, value) => parsers.user(value.data.user.result)
    },
    UsersByRestIds: {
        url: gql('xavgLWWbFH8wm_8MQN8plQ/UsersByRestIds'),
        method: 'GET',
        params: {} as { userIds: string[] },
        features: flags.user,
        format: async (fmt, value) => value.data.users.map((user: any) => parsers.user(user?.result)) as (User | UnavailableUser)[]
    },
    AboutAccountQuery: {
        url: gql('zs_jFPFT78rBpXv9Z3U2YQ/AboutAccountQuery'),
        method: 'GET',
        params: {} as { screenName: string },
        format: async (fmt, value) => parsers.aboutUser(value.data.user_result_by_screen_name.result)
    },
    UserTweets: {
        url: gql('-V26I6Pb5xDZ3C7BWwCQ_Q/UserTweets'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)
    },
    UserTweetsAndReplies: {
        url: gql('61HQnvcGP870hiE-hCbG4A/UserTweetsAndReplies'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)
    },
    UserMedia: {
        url: gql('MMnr49cP_nldzCTfeVDRtA/UserMedia'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.mediaEntries(value.data.user.result.timeline.timeline.instructions)
    },
    Likes: {
        url: gql('JR2gceKucIKcVNB_9JkhsA/Likes'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)
    },
    UserHighlightsTweets: {
        url: gql('QzHVmkiRhEfSMY_BRkxFRQ/UserHighlightsTweets'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)
    },
    UserSuperFollowTweets: {
        url: gql('toCUR18_0OFliE5VXqwHfg/UserSuperFollowTweets'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.entries(value.data.user.result.timeline.timeline.instructions)
    },
    Following: {
        url: gql('BEkNpEt5pNETESoqMsTEGA/Following'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN,
        format: async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)
    },
    Followers: {
        url: gql('kuFUYP9eV1FPoEy4N-pi7w/Followers'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN,
        format: async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)
    },
    FollowersYouKnow: {
        url: gql('G3jEqceFeMKS559RiF4UDw/FollowersYouKnow'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN,
        format: async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)
    },
    BlueVerifiedFollowers: {
        url: gql('8a7QJe2CCHf4AWcs-1P6KQ/BlueVerifiedFollowers'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: OAUTH_KEY,
        format: async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)
    },
    UserCreatorSubscriptions: {
        url: gql('fl06vhYypYRcRxgLKO011Q/UserCreatorSubscriptions'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)
    },
    UserCreatorSubscribers: {
        url: gql('0X21EWewnvqLxCWZwWrnpg/UserCreatorSubscribers'),
        method: 'GET',
        params: {} as { userId: string, cursor?: string },
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)
    },
    UserBusinessProfileTeamTimeline: {
        url: gql('KFaAofDlKP7bnzskNWmjwA/UserBusinessProfileTeamTimeline'),
        method: 'GET',
        params: {} as { userId: string, teamName: string, cursor?: string },
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        format: async (fmt, value) => parsers.userEntries(value.data.user.result.timeline.timeline.instructions)
    },
    RemoveFollower: {
        url: gql('QpNfg0kpPRfjROQ_9eOLXA/RemoveFollower'),
        method: 'POST',
        params: {} as { target_user_id: string },
        format: async (fmt, value) => value.data.remove_follower?.unfollow_success_reason === 'Unfollowed'
    },
    friendships_create: {
        url: v11('friendships/create.json'),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1},
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.id_str
    },
    friendships_destroy: {
        url: v11('friendships/destroy.json'),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1},
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.id_str
    },
    friendships_update: {
        url: v11('friendships/update.json'),
        method: 'POST',
        params: {} as { id: string, retweets?: boolean, device?: boolean },
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"cursor":-1},
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.relationship.target.id_str
    },
    friendships_cancel: {
        url: v11('friendships/cancel.json'),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.id_str
    },
    friendships_incoming: {
        url: v11('friendships/incoming.json'),
        method: 'GET',
        params: {} as { cursor: number },
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"stringify_ids":true,"count":100},
        token: ALT_TOKEN,
        format: async (fmt, value) => value as { ids: string[], next_cursor_str: string, previous_cursor_str: string }
    },
    friendships_accept: {
        url: v11('friendships/accept.json'),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.id_str
    },
    friendships_deny: {
        url: v11('friendships/deny.json'),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.id_str
    },
    blocks_create: {
        url: v11('blocks/create.json', false),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        requiresTransactionId: true,
        format: async (fmt, value) => !!value.id_str
    },
    blocks_destroy: {
        url: v11('blocks/destroy.json', false),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        requiresTransactionId: true,
        format: async (fmt, value) => !!value.id_str
    },
    mutes_users_create: {
        url: v11('mutes/users/create.json'),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.id_str
    },
    mutes_users_destroy: {
        url: v11('mutes/users/destroy.json'),
        method: 'POST',
        params: {} as { user_id: string } | { screen_name: string },
        token: ALT_TOKEN,
        format: async (fmt, value) => !!value.id_str
    }
} satisfies Record<string, Endpoint>;
