import * as flags from './flags.js';
import * as f from './fmt/index.js';
import { type AboutUser, type AccountSettings, type BirdwatchBatSignal, type BirdwatchHelpfulTag, type BirdwatchUnhelpfulTag, type BirdwatchUser, type CommunityResult, type DataSaverSettings, type DraftTweet, type ListResult, type TweetMediaData, type _MediaUploadInit, type Notification, type ScheduledTweet, type Slice, type Trend, type Tweet, type TweetBirdwatchNotes, type TweetResult, type TwitterResponse, type Typeahead, type UnreadCount, type User, type UserResult, type TweetTombstone, LongTweetBehavior, type TwitterOptions, AccountSession } from './types/index.js';
import { Endpoint, Range, type EndpointGroup } from './types/utils.js';
import { gql, v11 } from './utils/index.js';

export const PUBLIC_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
export const ALT_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F';
export const OAUTH_KEY = 'Bearer AAAAAAAAAAAAAAAAAAAAAG5LOQEAAAAAbEKsIYYIhrfOQqm4H8u7xcahRkU%3Dz98HKmzbeXdKqBfUDmElcqYl0cmmKY9KdS2UoNIz3Phapgsowi';

export const UPLOAD_SEGMENT_SIZE = 1 << 20;
export const MAX_TIMELINE_ITERATIONS = 5;
export const TWEET_TEXT_RANGE = new Range('0..=280');
export const TWEET_MEDIA_RANGE = new Range('0..=4');
export const TWEET_POLL_RANGE = new Range('2..=4');

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

export const EMPTY_SLICE: TwitterResponse<Slice<any>> = {
    errors: [],
    data: {
        entries: [],
        cursors: {}
    }
};

export const TWITTER_DEFAULT_OPTIONS: TwitterOptions = {
    debug: 3,
    domain: 'twitter.com',
    files: {},
    language: 'en',
    longTweetBehavior: LongTweetBehavior.Force,
    overrides: {}
};

export const GLOBAL_HEADERS = {
    accept: '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    priority: 'u=0, i',
    'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': "?0",
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'sec-gpc': '1',
    te: 'trailers',
    'upgrade-insecure-requests': '1',
    'user-agent': USER_AGENT
} satisfies Record<string, string>;



type _ReplyPermission = 'Community' /* Following */ | 'MyNetwork' /* Mutuals */ | 'Verified' | 'ByInvitation';
interface _CreateTweetEndpointParams {
    batch_compose?: 'BatchFirst' | 'BatchSubsequent',
    card_uri?: string,
    conversation_control?: {
        mode: _ReplyPermission
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
    semantic_annotation_options: {
        source: 'Htl' /* Home timeline */ | 'Profile' | 'Unknown' /* Under tweet replies */
    },
    tweet_text: string
}
interface _ScheduledTweetEndpointParams {
    execute_at: number,
    post_tweet_request: {
        auto_populate_reply_metadata: boolean,
        exclude_reply_user_ids: string[],
        media_ids: string[],
        status: string
    }
}

/**
 * All Twitter endpoints in use by the client
 * 
 * GraphQL endpoints last updated on 2026-11-09
 */
export const ENDPOINTS = ({
    // ACCOUNT
    BlockedAccountsAll: new Endpoint<Slice<UserResult>, { cursor?: string }>({
        url: gql('exDAeZuprdrqzXJu4UiNUQ/BlockedAccountsAll'),
        method: 'GET',
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.viewer.timeline.timeline.instructions)),
    BlockedAccountsImported: new Endpoint<Slice<UserResult>, { cursor?: string }>({
        url: gql('WEOd2IcmkM7ECwKhoEPZNg/BlockedAccountsImported'),
        method: 'GET',
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.viewer.timeline.timeline.instructions)),
    MutedAccounts: new Endpoint<Slice<UserResult>, { cursor?: string }>({
        url: gql('1heSSJ80TWeDGtoR7-X-iA/MutedAccounts'),
        method: 'GET',
        variables: {"count":20,"includePromotedContent":false},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.viewer.muting_timeline.timeline.instructions)),
    UserSessionsList: new Endpoint<AccountSession[]>({
        url: gql('vJ-XatpmQSG8bDch8-t9Jw/UserSessionsList'),
        method: 'GET'
    }, (fmt, value) => Promise.all((value.data.viewer.user_results.result.sessions_list as any[] || []).map(session => fmt.next(f.accountSession, session)))),
    DataSaverMode: new Endpoint<DataSaverSettings, { device_id: string }>({
        url: gql('xF6sXnKJfS2AOylzxRjf6A/DataSaverMode'),
        method: 'GET'
    }, (fmt, value) => fmt.next(f.dataSaverSettings, value.data.viewer?.dataUsageSettings)),
    account_settings: new Endpoint<AccountSettings>({
        url: v11('account/settings.json'),
        method: 'GET',
        variables: {"include_ext_sharing_audiospaces_listening_data_with_followers":true,"include_mention_filter":true,"include_nsfw_user_flag":true,"include_nsfw_admin_flag":true,"include_ranked_timeline":true,"include_alt_text_compose":true,"include_ext_dm_av_call_settings":true,"ext":"ssoConnections","include_country_code":true,"include_ext_dm_nsfw_media_filter":true}
    }, (fmt, value) => fmt.next(f.accountSettings, value)),
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
        method: 'POST',
        variables: {"displayNameMaxLength":50}
    }, (_, value) => !!value.id_str),
    account_update_profile_image: new Endpoint<boolean, { media_id: string }>({
        url: v11('account/update_profile_image.json'),
        method: 'POST',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"return_user":true}
    }, (_, value) => !!value.id_str),
    account_verify_credentials: new Endpoint<User>({
        url: v11('account/verify_credentials.json'),
        method: 'GET'
    }, (fmt, value) => fmt.next(f.user, value, { legacy: true })),



    // BIRDWATCH
    BirdwatchFetchGlobalTimeline: new Endpoint<Slice<TweetResult>>({
        url: gql('IJbJ4jU4OvOeYZOIC6eG6w/BirdwatchFetchGlobalTimeline'),
        method: 'GET',
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.viewer.birdwatch_home_page, { type: 'Birdwatch', root: value } as const)),
    BirdwatchFetchNotes: new Endpoint<TweetBirdwatchNotes, { tweet_id: string }>({
        url: gql('FXliMyVVZbAxaiRcs9USqA/BirdwatchFetchNotes'),
        method: 'GET',
        features: flags.birdwatch
    }, (fmt, value) => fmt.next(f.tweetBirdwatchNotes, value.data.tweet_result_by_rest_id.result)),
    BirdwatchFetchBirdwatchProfile: new Endpoint<BirdwatchUser, { alias: string }>({
        url: gql('id9iGfEQF47W1kvRBHUmRQ/BirdwatchFetchBirdwatchProfile'),
        method: 'GET'
    }, (fmt, value) => fmt.next(f.birdwatchUser, value.data.birdwatch_profile_by_alias)),
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
        method: 'POST',
        variables: {"source_platform":"BirdwatchWeb"}
    }, (_, value) => value.data.birdwatchnote_rate_v3?.__typename === 'BirdwatchNoteRating'),
    BirdwatchDeleteRating: new Endpoint<boolean, { note_id: string }>({
        url: gql('OpvCOyOoQClUND66zDzrnA/BirdwatchDeleteRating'),
        method: 'POST'
    }, (_, value) => value.data.birdwatchnote_rating_delete === 'Done'),
    BirdwatchCreateBatSignal: new Endpoint<string | undefined, { tweet_id: string, source_link: string, suggestion: string }>({
        url: gql('oCnZiCgsZJe8WEOKuS-xZw/BirdwatchCreateBatSignal'),
        method: 'POST'
    }, (_, value) => value.data.birdwatchbatsignal_create?.signal_id),
    BirdwatchDeleteBatSignal: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('yQF40wfWdHfXeKL4ZVklcw/BirdwatchDeleteBatSignal'),
        method: 'POST'
    }, (_, value) => value.data.birdwatchbatsignal_delete === 'Done'),
    BirdwatchFetchBatSignal: new Endpoint<BirdwatchBatSignal, { tweet_id: string }>({
        url: gql('7LFdey6iP2bf5f2_aN80Ng/BirdwatchFetchBatSignal'),
        method: 'GET',
        features: { responsive_web_birdwatch_note_request_sources_enabled: true, responsive_web_birdwatch_live_note_enabled: true }
    }, (fmt, value) => fmt.next(f.birdwatchBatSignal, value.data.birdwatch_bat_signal_by_rest_id)),
    // TODO
    BirdwatchCreateNote: new Endpoint<unknown, {}>({
        url: gql('dZ5t9-LyPZD4kGNP5PEQMQ/BirdwatchCreateNote'),
        method: 'POST'
    }, (_, value) => value),
    // TODO
    BirdwatchDeleteNote: new Endpoint<unknown, {}>({
        url: gql('IKS_qrShkDyor6Ri1ahd9g/BirdwatchDeleteNote'),
        method: 'POST'
    }, (_, value) => value),
    BirdwatchEditNotificationSettings: new Endpoint<boolean, { settings: 'All' | 'Week' | 'Month' | 'Never' }>({
        url: gql('FLgLReVIssXjB_ui3wcrRQ/BirdwatchEditNotificationSettings'),
        method: 'POST'
    }, (_, value) => value.data.authenticated_user_birdwatch_profile_set_notification_settings_put === 'Done'),



    // BOOKMARKS
    Bookmarks: new Endpoint<Slice<TweetResult>, { cursor?: string }>({
        url: gql('fjf5b5Lu82lYMSBRhppK2g/Bookmarks'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.bookmark_timeline_v2.timeline.instructions, { type: 'Default' } as const)),
    BookmarkSearchTimeline: new Endpoint<Slice<TweetResult>, { rawQuery: string, cursor?: string }>({
        url: gql('vLHjqbDv7TPFMBkIIO1nOA/SearchTimeline'),
        method: 'GET',
        variables: {"count":50},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.search_by_raw_query.bookmarks_search_timeline.timeline.instructions, { type: 'Default' } as const)),
    CreateBookmark: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('aoDbu3RHznuiSkQ9aNM67Q/CreateBookmark'),
        method: 'POST',
        token: OAUTH_KEY
    }, (_, value) => value.data.tweet_bookmark_put === 'Done'),
    DeleteBookmark: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('Wlmlj2-xzyS1GN3a6cj-mQ/DeleteBookmark'),
        method: 'POST',
        token: OAUTH_KEY
    }, (_, value) => value.data.tweet_bookmark_delete === 'Done'),
    BookmarksAllDelete: new Endpoint<boolean>({
        url: gql('skiACZKC1GDYli-M8RzEPQ/BookmarksAllDelete'),
        method: 'POST',
        token: OAUTH_KEY
    }, (_, value) => value.data.bookmark_all_delete === 'Done'),
    /** not implemented */
    createBookmarkFolder: new Endpoint<unknown>({
        url: gql('6Xxqpq8TM_CREYiuof_h5w/createBookmarkFolder'),
        method: 'POST'
    }, (_, value) => value),
    /** not implemented */
    DeleteBookmarkFolder: new Endpoint<unknown, any>({
        url: gql('2UTTsO-6zs93XqlEUZPsSg/DeleteBookmarkFolder'),
        method: 'POST'
    }, (_, value) => value),



    // COMMUNITY
    CommunityByRestId: new Endpoint<CommunityResult, { communityId: string }>({
        url: gql('iMDyRADcGz4r9ZrJMpxz1A/CommunityByRestId'),
        method: 'GET',
        features: flags.short
    }, (fmt, value) => fmt.next(f.communityResult, value.data.communityResults.result)),
    CommunityTweetsTimeline: new Endpoint<Slice<TweetResult>, { communityId: string, rankingMode: 'Relevance' | 'Recency', cursor?: string }>({
        url: gql('bKYFeT4aNUQDMHx4gyXIoQ/CommunityTweetsTimeline'),
        method: 'GET',
        variables: {"count":20,"displayLocation":"Community","withCommunity":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.communityResults.result.ranked_community_timeline.timeline.instructions, { type: 'Default' } as const)),
    CommunityMediaTimeline: new Endpoint<Slice<TweetResult>, { communityId: string, cursor?: string }>({
        url: gql('m_IF9tFIf_iDPaRbree99g/CommunityMediaTimeline'),
        method: 'GET',
        variables: {"count":20,"displayLocation":"Community","withCommunity":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.communityResults.result.ranked_community_timeline.timeline.instructions, {
        type: 'Media',
        gridModule: {
            content: (value.data.communityResults.result.ranked_community_timeline.timeline.instructions as any[] || []).find(i => i.type === 'TimelineAddToModule'),
            key: 'moduleItems'
        }
    } as const)),
    JoinCommunity: new Endpoint<boolean, { communityId: string }>({
        url: gql('3jItWhb1PKC9lute3hWWXA/JoinCommunity'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.community_join.id_str),
    RequestToJoinCommunity: new Endpoint<boolean, { communityId: string }>({
        url: gql('3jItWhb1PKC9lute3hWWXA/JoinCommunity'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data),
    LeaveCommunity: new Endpoint<boolean, { communityId: string }>({
        url: gql('0qehtlwzUschfhKTAv0lKQ/LeaveCommunity'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.community_leave.id_str),



    // DISCOVER
    ExplorePage: new Endpoint<Slice<TweetResult | Trend>, { cursor: string }>({
        url: 'CVExg1KY6Ec9BioRBbI8Jg/ExplorePage',
        method: 'GET',
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.discover, value.data.explore_page.body, { root: value })),
    ExploreSidebar: new Endpoint<Slice<Trend>>({
        url: 'cM7LCaFTQnUWRA1jMWH6Pg/ExploreSidebar',
        method: 'GET',
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.trends, value.data.explore_sidebar.timeline.instructions)),
    set_explore_settings: new Endpoint<boolean, { use_personalized_trends: `${boolean}` } | { use_current_location: `${boolean}` }>({
        url: 'https://twitter.com/i/api/2/guide/set_explore_settings.json',
        method: 'POST'
    }, (_, value) => !!value),



    // DMS
    xChatDmSettingsQuery: new Endpoint<unknown>({
        url: gql('mRmm_3aCzCcbpzBkhyhCDg/xChatDmSettingsQuery'),
        method: 'GET',
        variables: {}
    }, (_, value) => value),
    xChatDmSettingsMutation: new Endpoint<unknown, {
        allow_dms_from: 'all' | 'verified' | 'following',
        always_allow_dms_from_subscribers: boolean,
        av_settings: {
            av_call_permissions: {
                accept_calls_from_addressbook: boolean,
                accept_calls_from_everyone: boolean,
                accept_calls_from_following: boolean,
                accept_calls_from_verified: boolean
            },
            has_av_calls_enabled: boolean,
            has_enhanced_call_privacy_enabled: boolean
        },
        dm_quality_filter: 'enabled' | 'disabled'
    }>({
        url: gql('urpRL7pR-8DKF8gzHOnXdw/xChatDmSettingsMutation'),
        method: 'POST'
    }, (_, value) => value),



    // LIST
    ListByRestId: new Endpoint<ListResult, { listId: string }>({
        url: gql('T-YE5ZY0cd0UVtWu8AP04Q/ListByRestId'),
        method: 'GET',
        features: flags.short
    }, (fmt, value) => fmt.next(f.listResult, value.data.list)),
    ListBySlug: new Endpoint<ListResult, { listId: string }>({
        url: gql('ZX5ei7t018bDaDcy4VWBeA/ListBySlug'),
        method: 'GET',
        features: flags.short
    }, (fmt, value) => fmt.next(f.listResult, value.data.list)),
    ListLatestTweetsTimeline: new Endpoint<Slice<TweetResult>, { listId: string, cursor?: string }>({
        url: gql('UMc_lPEeKz_WiKSY8ZT7yw/ListLatestTweetsTimeline'),
        method: 'GET',
        variables: {"count":40},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.list.tweets_timeline.timeline.instructions, { type: 'Default' } as const)),
    // TODO
    ListsManagementPageTimeline: new Endpoint<unknown>({
        url: gql('HeY9oqJxWKHSTCoBXaWnHg/ListsManagementPageTimeline'),
        method: 'GET',
        variables: {"count":100},
        features: flags.timeline
    }, (_, value) => value),
    ListsDiscovery: new Endpoint<Slice<ListResult>>({
        url: gql('qhh973x9m-R6SVBXpJHxdw/ListsDiscovery'),
        method: 'GET',
        variables: {"count":40},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.lists, value.data.list_discovery_list_mixer_timeline.timeline.instructions, { type: 'Discovery' } as const)),
    ListMemberships: new Endpoint<Slice<ListResult>, { cursor?: string }>({
        url: gql('UcQucBOWpQ1_KoYuNyrNMw/ListMemberships'),
        method: 'GET',
        variables: {"count":20},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.lists, value.data.user.result.timeline.instructions, { type: 'Default' } as const)),
    ListOwnerships: new Endpoint<Slice<ListResult>, { userId: string, isListMemberTargetUserId: string, cursor?: string }>({
        url: gql('JyQg9kTLrzFPtt8QydtiNA/ListOwnerships'),
        method: 'GET',
        variables: {"count":20},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.lists, value.data.user.result.timeline.instructions, { type: 'Default' } as const)),
    ListMembers: new Endpoint<Slice<UserResult>, { listId: string, cursor?: string }>({
        url: gql('vgA6FHTOKJQ1rJ7iiHc0xw/ListMembers'),
        method: 'GET',
        variables: {"count":40},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.list.members_timeline.timeline.instructions)),
    ListSubscribers: new Endpoint<Slice<UserResult>, { listId: string, cursor?: string }>({
        url: gql('QSCka9VX6mjOARoPtihe0Q/ListSubscribers'),
        method: 'GET',
        variables: {"count":40},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.list.subscribers_timeline.timeline.instructions)),
    ListCreationRecommendedUsers: new Endpoint<Slice<UserResult>, { listId: string, cursor?: string }>({
        url: gql('tEkcpXd8f-TzE_-mkuOTLw/ListCreationRecommendedUsers'),
        method: 'GET',
        variables: {"count":20},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.list.recommended_users.timeline.instructions)),
    ListEditRecommendedUsers: new Endpoint<Slice<UserResult>, { listId: string, cursor?: string }>({
        url: gql('NS40Y5Fgobu1XJUmT_DQyw/ListEditRecommendedUsers'),
        method: 'GET',
        variables: {"count":20},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.list.recommended_users.timeline.instructions)),
    CombinedLists: new Endpoint<Slice<ListResult>, { userId: string, cursor?: string }>({
        url: gql('r4OjZGZWNqdV6smWr30C3w/CombinedLists'),
        method: 'GET',
        variables: {"count":100},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.lists, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    CreateList: new Endpoint<ListResult, { name: string, description: string, isPrivate: boolean }>({
        url: gql('zdGzorOEOslDL4XEbe2INw/CreateList'),
        method: 'POST',
        features: flags.short
    }, (fmt, value) => fmt.next(f.listResult, value.list)),
    DeleteList: new Endpoint<unknown, { listId: string }>({
        url: gql('UnN9Th1BDbeLjpgjGSpL3Q/DeleteList'),
        method: 'POST'
    }, (_, value) => value.list_delete === 'Done'),
    UpdateList: new Endpoint<boolean, { listId: string, name: string, description: string, isPrivate: boolean }>({
        url: gql('oe5s3-_kb6-t8iFv4hLH3A/UpdateList'),
        method: 'POST'
    }, (_, value) => !!value.data.list.id_str),
    EditListBanner: new Endpoint<boolean, { listId: string, mediaId: string }>({
        url: gql('PSBi0stSrf3-hDy3G_O_0Q/EditListBanner'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.list.id_str),
    DeleteListBanner: new Endpoint<boolean, { listId: string }>({
        url: gql('my6Lh9X_pvMtrK_c3VjfNA/DeleteListBanner'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.list.id_str),
    ListAddMember: new Endpoint<boolean, { listId: string, userId: string }>({
        url: gql('-Kf1YVC1rNKkPvPFk7YXZw/ListAddMember'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.list.id_str),
    ListRemoveMember: new Endpoint<boolean, { listId: string, userId: string }>({
        url: gql('_2o1-wSMWGFSi5HUscn1Hw/ListRemoveMember'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.list.id_str),
    ListSubscribe: new Endpoint<boolean, { listId: string }>({
        url: gql('k5mwUiaPTQ_Hhr8DNXQ5YA/ListSubscribe'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.list_subscribe_v3.id_str),
    ListUnsubscribe: new Endpoint<boolean, { listId: string }>({
        url: gql('HwX1NRCSksXzmpolnY0Xhw/ListUnsubscribe'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.list.id_str),
    PinTimeline: new Endpoint<boolean, { pinnedTimelineItem: { id: string, pinned_timeline_type: 'List' } }>({
        url: gql('qaz5JhPxqI3UqAgkTpsGyQ/PinTimeline'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.pin_timeline.updated_pinned_timeline.list.id_str),
    UnpinTimeline: new Endpoint<boolean, { pinnedTimelineItem: { id: string, pinned_timeline_type: 'List' } }>({
        url: gql('u_Nxpj-y-PoTFHEM9saz2Q/UnpinTimeline'),
        method: 'POST',
        features: flags.short
    }, (_, value) => !!value.data.unpin_timeline.updated_pinned_timeline.list.id_str),
    MuteList: new Endpoint<boolean, { listId: string }>({
        url: gql('ZYyanJsskNUcltu9bliMLA/MuteList'),
        method: 'POST'
    }, (_, value) => value.data.list === 'Done'),
    UnmuteList: new Endpoint<boolean, { listId: string }>({
        url: gql('pMZrHRNsmEkXgbn3tOyr7Q/UnmuteList'),
        method: 'POST'
    }, (_, value) => value.data.list === 'Done'),



    // NOTIFICATIONS
    NotificationsTimeline: new Endpoint<Slice<Notification>, { timeline_type: 'All' | 'Verified' | 'Mentions', cursor?: string }>({
        url: gql('XANkUc-HLIcCl8q85rGC2A/NotificationsTimeline'),
        method: 'GET',
        variables: {"count":40},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.notifications, value.data.viewer_v2.user_results.result.notification_timeline.timeline.instructions)),
    badge_count: new Endpoint<UnreadCount>({
        url: 'https://twitter.com/i/api/2/badge_count/badge_count.json',
        method: 'GET',
        variables: {"supports_ntab_urt":1,"include_xchat_count":1}
    }, (fmt, value) => fmt.next(f.unreadCount, value)),
    last_seen_cursor: new Endpoint<string, { cursor: string }>({
        url: 'https://twitter.com/i/api/2/notifications/all/last_seen_cursor.json',
        method: 'POST'
    }, (_, value) => value.cursor as string),
    device_follow: new Endpoint<Slice<TweetResult>, { cursor?: string }>({
        url: 'https://twitter.com/i/api/2/notifications/device_follow.json',
        method: 'GET',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_has_nft_avatar":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"cards_platform":"Web-12","include_cards":1,"include_ext_alt_text":true,"include_ext_limited_action_results":true,"include_quote_count":true,"include_reply_count":1,"tweet_mode":"extended","include_ext_views":true,"include_entities":true,"include_user_entities":true,"include_ext_media_color":true,"include_ext_media_availability":true,"include_ext_sensitive_media_warning":true,"include_ext_trusted_friends_metadata":true,"send_error_codes":true,"simple_quoted_tweet":true,"count":20,"requestContext":"launch","ext":"mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CbirdwatchPivot%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl"}
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.timeline.instructions[0].addEntries.entries, { type: 'DeviceFollow', globalObjects: value.globalObjects } as const)),



    // SEARCH
    SearchTimeline: new Endpoint<Slice<TweetResult | UserResult | ListResult>, { rawQuery: string, querySource: 'typed_query' | 'recent_search_click' | 'tdqt', product: 'Top' | 'Latest' | 'People' | 'Media' | 'Lists', cursor?: string }>({
        url: gql('vLHjqbDv7TPFMBkIIO1nOA/SearchTimeline'),
        method: 'GET',
        variables: {"count":40},
        features: flags.timeline,
        token: ALT_TOKEN,
    }, (fmt, value) => fmt.next(f.Entries.search, value.data.search_by_raw_query.search_timeline.timeline.instructions)),
    search_typeahead: new Endpoint<Typeahead, { q: string }>({
        url: v11('search/typeahead.json'),
        method: 'GET',
        variables: {"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"src":"search_box","result_type":"events,users,topics,lists"}
    }, (fmt, value) => fmt.next(f.typeahead, value)),



    // TIMELINE
    HomeLatestTimeline: new Endpoint<Slice<TweetResult>, { seenTweetIds: string[], requestContext?: 'launch', cursor?: string }>({
        url: gql('IVA5BUbeYPTrpYekQH7jiA/HomeLatestTimeline'),
        method: 'GET',
        variables: {"count":20,"includePromotedContent":false,"latestControlAvailable":true,"withCommunity":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.home.home_timeline_urt.instructions, { type: 'Default' } as const)),
    HomeTimeline: new Endpoint<Slice<TweetResult>, { seenTweetIds: string[], requestContext?: 'launch', cursor?: string }>({
        url: gql('KmJCeZ__ef1fNos7tKN_fg/HomeTimeline'),
        method: 'GET',
        variables: {"count":20,"includePromotedContent":false,"latestControlAvailable":true,"withCommunity":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.home.home_timeline_urt.instructions, { type: 'Default' } as const)),
    GenericTimelineById: {
        default: new Endpoint<Slice<TweetResult>, { timelineId: string, cursor?: string }>({
            url: gql('UToImY30uYcerTaw8gu21w/GenericTimelineById'),
            method: 'GET',
            variables: {"count":20,"withQuickPromoteEligibilityTweetFields":true},
            features: flags.timeline
        }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.timeline.timeline.instructions, { type: 'Default' } as const)),
        trends: new Endpoint<Slice<Trend>, { timelineId: string, cursor?: string }>({
            url: gql('UToImY30uYcerTaw8gu21w/GenericTimelineById'),
            method: 'GET',
            variables: {"count":20,"withQuickPromoteEligibilityTweetFields":true},
            features: flags.timeline
        }, (fmt, value) => fmt.next(f.Entries.trends, value.data.timeline.timeline.instructions)),
    },
    // TODO: whatever this thing is requires a new parser
    inspiration_remote_urt: new Endpoint<string | undefined, { engagement: 'fjf5b5Lu82lYMSBRhppK2g/Bookmarks' | 'Shares' | 'VideoQualityViews', period: 'Daily' | 'Weekly' | 'Monthly', language: string }>({
        url: 'https://twitter.com/i/jfapi/creators/inspiration/remote/urt',
        method: 'GET'
    }, (_, value) => value as unknown as string),



    // TWEET
    CreateTweet: new Endpoint<Tweet, _CreateTweetEndpointParams>({
        url: gql('l4hk8uVGvR-a8kzQ4nOhPA/CreateTweet'),
        method: 'POST',
        variables: {"disallowed_reply_options":null},
        features: flags.tweet
    }, (fmt, value) => fmt.next(f.tweet, value.data.create_tweet?.tweet_results?.result)),
    CreateNoteTweet: new Endpoint<Tweet, _CreateTweetEndpointParams>({
        url: gql('seOZkIS8AysCGfPo6yYPVA/CreateNoteTweet'),
        method: 'POST',
        features: flags.tweet
    }, (fmt, value) => fmt.next(f.tweet, value.data.notetweet_create?.tweet_results?.result)),
    DeleteTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('nxpZCY2K-I6QoFHAHeojFQ/DeleteTweet'),
        method: 'POST',
        variables: {"dark_request":false}
    }, (_, value) => !!value.delete_tweet),
    CreateScheduledTweet: new Endpoint<string, _ScheduledTweetEndpointParams>({
        url: gql('LCVzRQGxOaGnOnYH01NQXg/CreateScheduledTweet'),
        method: 'POST'
    }, (_, value) => value.data.tweet?.rest_id as string),
    EditScheduledTweet: new Endpoint<boolean, _ScheduledTweetEndpointParams & { scheduled_tweet_id: string }>({
        url: gql('_mHkQ5LHpRRjSXKOcG6eZw/EditScheduledTweet'),
        method: 'POST'
    }, (_, value) => value.data.scheduledtweet_put === 'Done'),
    DeleteScheduledTweet: new Endpoint<boolean, { scheduled_tweet_id: string }>({
        url: gql('CTOVqej0JBXAZSwkp1US0g/DeleteScheduledTweet'),
        method: 'POST'
    }, (_, value) => value.data.scheduledtweet_delete === 'Done'),
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
        method: 'POST'
    }, (_, value) => value.data.tweet.rest_id as string),
    EditDraftTweet: new Endpoint<boolean, {
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
        method: 'POST'
    }, (_, value) => value.data.drafttweet_put === 'Done'),
    DeleteDraftTweet: new Endpoint<boolean, { draft_tweet_id: string }>({
        url: gql('bkh9G3FGgTldS9iTKWWYYw/DeleteDraftTweet'),
        method: 'POST'
    }, (_, value) => value.data.drafttweet_delete === 'Done'),
    FetchDraftTweets: new Endpoint<DraftTweet[], { ascending: boolean }>({
        url: gql('L9RqKWmAWxK6vGtR3Qdsxw/FetchDraftTweets'),
        method: 'GET'
    }, (fmt, value) => Promise.all((value.viewer.draft_list.response_data as any[] || []).map(tweet => fmt.next(f.draftTweet, tweet)))),
    FetchScheduledTweets: new Endpoint<ScheduledTweet[], { ascending: boolean }>({
        url: gql('H2elmT2R9DLhWoo0DZFNkA/FetchScheduledTweets'),
        method: 'GET'
    }, (fmt, value) => Promise.all((value.viewer.scheduled_tweet_list as any[] || []).map(tweet => fmt.next(f.scheduledTweet, tweet)))),
    TweetDetail: new Endpoint<Slice<TweetResult>, { focalTweetId: string, rankingMode: 'Relevance' | 'Recency' | 'Likes', cursor?: string }>({
        url: gql('dQDdKtt882nl-Km98FJGSQ/TweetDetail'),
        method: 'GET',
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.threaded_conversation_with_injections_v2.instructions, { type: 'Default' } as const)),
    TweetResultByRestId: new Endpoint<Tweet | TweetTombstone, { tweetId: string }>({
        url: gql('U8lc5aomF5krJzZ9vJ9wxg/TweetResultByRestId'),
        method: 'GET',
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.tweetOrTombstone, value.data.tweetResult.result)),
    TweetResultsByRestIds: new Endpoint<(Tweet | TweetTombstone)[], { tweetIds: string[] }>({
        url: gql('yW_CmYWEKwaOpAEHpNSReg/TweetResultsByRestIds'),
        method: 'GET',
        variables: {"with_rux_injections":false,"includePromotedContent":false,"withCommunity":true,"withBirdwatchNotes":true,"withVoice":true,"withV2Timeline":true},
        features: flags.timeline
    }, (fmt, value) => Promise.all((value.data.tweetResult as any[] || []).map(tweet => fmt.next(f.tweetOrTombstone, tweet?.result)))),
    ModeratedTimeline: new Endpoint<Slice<TweetResult>, { rootTweetId: string, cursor?: string }>({
        url: gql('PFe_4rTGtvczfkQ1_rvjNA/ModeratedTimeline'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":false},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.tweet.result.timeline_response.timeline.instructions, { type: 'Default' } as const)),
    Favoriters: new Endpoint<Slice<UserResult>, { tweetId: string, cursor?: string }>({
        url: gql('JGLhZd8aiYqBdjBBcRTwNg/Favoriters'),
        method: 'GET',
        variables: {"count":40,"enableRanking":false,"includePromotedContent":false},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.favoriters_timeline.timeline.instructions)),
    Retweeters: new Endpoint<Slice<UserResult>, { tweetId: string, cursor?: string }>({
        url: gql('VzgCyBwfqzAvPjK2E4U2vA/Retweeters'),
        method: 'GET',
        variables: {"count":40,"enableRanking":false,"includePromotedContent":false},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.retweeters_timeline.timeline.instructions)),
    FavoriteTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('lI07N6Otwv1PhnEgXILM7A/FavoriteTweet'),
        method: 'POST'
    }, (_, value) => value.data.favorite_tweet === 'Done'),
    UnfavoriteTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('ZYKSe-w7KEslx3JhSIk5LA/UnfavoriteTweet'),
        method: 'POST'
    }, (_, value) => value.data.unfavorite_tweet === 'Done'),
    CreateRetweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('mbRO74GrOvSfRcJnlMapnQ/CreateRetweet'),
        method: 'POST',
        variables: {"dark_request":false}
    }, (_, value) => value.data.create_retweet?.retweet_results?.result?.rest_id),
    DeleteRetweet: new Endpoint<boolean, { source_tweet_id: string }>({
        url: gql('ZyZigVsNiFO6v1dEks1eWg/DeleteRetweet'),
        method: 'POST',
        variables: {"dark_request":false}
    }, (_, value) => value.data.unretweet?.source_retweet_results?.result?.rest_id),
    DownvoteTweet: new Endpoint<boolean, { tweetId: string }>({
        url: gql('Iu4kUV4vd_iHMupiHPPrAQ/DownvoteTweet'),
        method: 'POST'
    }, (_, value) => !!value.data),
    UndoDownvoteTweet: new Endpoint<boolean, { tweetId: string }>({
        url: gql('Iu4kUV4vd_iHMupiHPPrAQ/DownvoteTweet'),
        method: 'POST'
    }, (_, value) => !!value.data),
    ModerateTweet: new Endpoint<boolean, { tweetId: string }>({
        url: gql('pjFnHGVqCjTcZol0xcBJjw/ModerateTweet'),
        method: 'POST'
    }, (_, value) => value.data.tweet_moderate_put === 'Done'),
    UnmoderateTweet: new Endpoint<boolean, { tweetId: string }>({
        url: gql('pVSyu6PA57TLvIE4nN2tsA/UnmoderateTweet'),
        method: 'POST'
    }, (_, value) => value.data.tweet_unmoderate_put === 'Done'),
    PinTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('VIHsNu89pK-kW35JpHq7Xw/PinTweet'),
        method: 'POST'
    }, (_, value) => value.data.pin_tweet?.message?.includes('success')),
    UnpinTweet: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('BhKei844ypCyLYCg0nwigw/UnpinTweet'),
        method: 'POST'
    }, (_, value) => value.data.unpin_tweet?.message?.includes('success')),
    ConversationControlChange: new Endpoint<boolean, { tweet_id: string, mode: _ReplyPermission }>({
        url: gql('JWeo7tCAhI_HwcuPcL4JrQ/ConversationControlChange'),
        method: 'POST'
    }, (_, value) => value.data.tweet_conversation_control_put === 'Done'),
    ConversationControlDelete: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('OoMO_aSZ1ZXjegeamF9QmA/ConversationControlDelete'),
        method: 'POST'
    }, (_, value) => value.data.tweet_conversation_control_delete === 'Done'),
    UnmentionUserFromConversation: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('xVW9j3OqoBRY9d6_2OONEg/UnmentionUserFromConversation'),
        method: 'POST'
    }, (_, value) => value.data.unmention_user === 'Done'),
    AddContentDisclosure: new Endpoint<boolean, { tweet_id: string, advertising_disclosure: { is_paid_promotion: boolean }, ai_generated_disclosure: { has_ai_generated_media: boolean } }>({
        url: gql('D1nwFlsu_qHsX92YzoRaaA/AddContentDisclosure'),
        method: 'POST'
    }, (_, value) => value.tweet_add_content_disclosure_put === 'Done'),
    DeleteContentDisclosure: new Endpoint<boolean, { tweet_id: string }>({
        url: gql('YeIV-eqGwEZXDtYaDsJz2Q/DeleteContentDisclosure'),
        method: 'POST'
    }, (_, value) => value.tweet_add_content_disclosure_delete === 'Done'),
    mutes_conversations_create: new Endpoint<boolean, { tweet_id: string }>({
        url: v11('mutes/conversations/create.json'),
        method: 'POST',
        token: OAUTH_KEY
    }, (_, value) => !!value.id_str),
    mutes_conversations_destroy: new Endpoint<boolean, { tweet_id: string }>({
        url: v11('mutes/conversations/destroy.json'),
        method: 'POST',
        token: OAUTH_KEY
    }, (_, value) => !!value.id_str),
    cards_create: new Endpoint<string, { card_data: string }>({
        url: 'https://caps.twitter.com/v2/cards/create.json',
        method: 'POST'
    }, (_, value) => value.card_uri as string),
    capi_passthrough_1: new Endpoint<boolean, { 'twitter:string:card_uri': string, 'twitter:long:original_tweet_id': string, 'twitter:string:response_card_name'?: string, 'twitter:string:selected_choice': number }>({
        url: 'https://caps.twitter.com/v2/capi/passthrough/1',
        method: 'POST',
        variables: { 'twitter:string:cards_platform': 'Web-12' }
    }, (_, value) => !!value.card.url),
    media_upload: {
        init: new Endpoint<_MediaUploadInit>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'GET',
            variables: {"command":"INIT"}
        }, (_, value) => value as _MediaUploadInit),
        append: new Endpoint<unknown, { media_id: string, segment_index: number }>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'POST',
            variables: {"command":"APPEND"}
        }, (_, value) => value),
        finalize: new Endpoint<TweetMediaData>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'GET',
            variables: {"command":"FINALIZE"}
        }, (fmt, value) => fmt.next(f.tweetMediaData, value)),
        status: new Endpoint<TweetMediaData>({
            url: 'https://upload.twitter.com/1.1/media/upload.json',
            method: 'GET',
            variables: {"command":"STATUS"}
        }, (fmt, value) => fmt.next(f.tweetMediaData, value)),
    },
    media_metadata_create: new Endpoint<boolean, { allow_download_status: { allow_download: `${boolean}` }, alt_text?: { text: string }, media_id: string }>({
        url: v11('media/metadata/create.json'),
        method: 'POST'
    }, () => true),



    // USER
    UserByScreenName: new Endpoint<UserResult, { screen_name: string }>({
        url: gql('AMIBMjtxEEATh4z8V9GtRg/UserByScreenName'),
        method: 'GET',
        features: flags.user
    }, (fmt, value) => fmt.next(f.userResult, value.data.user.result)),
    UsersByScreenNames: new Endpoint<UserResult[], { screen_names: string[] }>({
        url: gql('cACg_kWQkzNQ74lcK5rksQ/UsersByScreenNames'),
        method: 'GET',
        features: flags.user
    }, (fmt, value) => Promise.all((value.data.users as any[] || []).map(user => fmt.next(f.userResult, user?.result)))),
    UserByRestId: new Endpoint<UserResult, { userId: string }>({
        url: gql('mxaYWwt52eAb6OAzYHMVzg/UserByRestId'),
        method: 'GET',
        features: flags.user
    }, (fmt, value) => fmt.next(f.userResult, value.data.user.result)),
    UsersByRestIds: new Endpoint<UserResult[], { userIds: string[] }>({
        url: gql('ubfbnAM4qTlMTOYleYhXSg/UsersByRestIds'),
        method: 'GET',
        features: flags.user
    }, (fmt, value) => Promise.all((value.data.users as any[] || []).map(user => fmt.next(f.userResult, user?.result)))),
    grok_translation: new Endpoint<string, { content_type: 'POST' | 'BIO' | 'COMMUNITY_NOTE', dst_lang: string, id: string }>({
        url: 'https://api.twitter.com/2/grok/translation.json',
        method: 'POST'
    }, (_, value) => value.result.text as string),
    AboutAccountQuery: new Endpoint<AboutUser, { screenName: string }>({
        url: gql('XRqGa7EeokUU5kppkh13EA/AboutAccountQuery'),
        method: 'GET'
    }, (fmt, value) => fmt.next(f.aboutUser, value.data.user_result_by_screen_name.result)),
    UserTweets: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('D6z-FJI2pKuwEeYYxVIGbg/UserTweets'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withQuickPromoteEligibilityTweetFields":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserTweetsAndReplies: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('FmuxExUC21Xn_C2NwtX5sQ/UserTweetsAndReplies'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withQuickPromoteEligibilityTweetFields":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserMedia: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('iTSlWbsmD00dAE7Sk9xvIw/UserMedia'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withQuickPromoteEligibilityTweetFields":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Media' } as const)),
    Likes: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('ZjyvI1V9gajq5eclHCObzA/Likes'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withQuickPromoteEligibilityTweetFields":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserOriginalsTimeline: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('ZFKu1DFS63hgrkLzR3Hsdw/UserOriginalsTimeline'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withQuickPromoteEligibilityTweetFields":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserRepliesTimeline: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('fpl-c0_APDI3nZ1CeeBMbg/UserRepliesTimeline'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withQuickPromoteEligibilityTweetFields":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserRepostsTimeline: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('bWzOK-jDN4SYVcF6AQ22Qw/UserRepostsTimeline'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserPhotoTimeline: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('zk9sfrhiW8gNjQUP-hwung/UserPhotoTimeline'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":false,"withClientEventToken":true,"withBirdwatchNotes":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserVideoTimeline: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('1UmMb8X-BFHS98GG6DyRsQ/UserVideoTimeline'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":false,"withClientEventToken":true,"withBirdwatchNotes":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserHighlightsTweets: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('vukXwNm6argozncYmHqZDQ/UserHighlightsTweets'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    UserSuperFollowTweets: new Endpoint<Slice<TweetResult>, { userId: string, cursor?: string }>({
        url: gql('ytLS5NE_Bm3wQBztZWFtAQ/UserSuperFollowTweets'),
        method: 'GET',
        variables: {"count":40,"includePromotedContent":true,"withCommunity":true,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.tweets, value.data.user.result.timeline.timeline.instructions, { type: 'Default' } as const)),
    Following: new Endpoint<Slice<UserResult>, { userId: string, cursor?: string }>({
        url: gql('eDqlbOS46zda8jDT8dEQ_Q/Following'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.user.result.timeline.timeline.instructions)),
    Followers: new Endpoint<Slice<UserResult>, { userId: string, cursor?: string }>({
        url: gql('Xe3y9_ndZ9-RtWz8zd_wpg/Followers'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.user.result.timeline.timeline.instructions)),
    FollowersYouKnow: new Endpoint<Slice<UserResult>, { userId: string, cursor?: string }>({
        url: gql('N-5YQGqcnNO164XwsevHCA/FollowersYouKnow'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: ALT_TOKEN
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.user.result.timeline.timeline.instructions)),
    BlueVerifiedFollowers: new Endpoint<Slice<UserResult>, { userId: string, cursor?: string }>({
        url: gql('Xe3y9_ndZ9-RtWz8zd_wpg/Followers'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline,
        token: OAUTH_KEY
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.user.result.timeline.timeline.instructions)),
    UserCreatorSubscriptions: new Endpoint<Slice<UserResult>, { userId: string, cursor?: string }>({
        url: gql('mdZ9ngiV6niOd2neFHNDSA/UserCreatorSubscriptions'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.user.result.timeline.timeline.instructions)),
    UserCreatorSubscribers: new Endpoint<Slice<UserResult>, { userId: string, cursor?: string }>({
        url: gql('p76dCNURUPURadTDyyWbEg/UserCreatorSubscribers'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.user.result.timeline.timeline.instructions)),
    UserBusinessProfileTeamTimeline: new Endpoint<Slice<UserResult>, { userId: string, teamName: string, cursor?: string }>({
        url: gql('I-zB8JQXsfUsQP8bBiWQkw/UserBusinessProfileTeamTimeline'),
        method: 'GET',
        variables: {"count":50,"includePromotedContent":false,"withVoice":true},
        features: flags.timeline
    }, (fmt, value) => fmt.next(f.Entries.users, value.data.user.result.timeline.timeline.instructions)),
    RemoveFollower: new Endpoint<boolean, { target_user_id: string }>({
        url: gql('QpNfg0kpPRfjROQ_9eOLXA/RemoveFollower'),
        method: 'POST'
    }, (_, value) => value.data.remove_follower?.unfollow_success_reason === 'Unfollowed'),
    friendships_create: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/create.json'),
        method: 'POST',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1},
        token: ALT_TOKEN
    }, (_, value) => !!value.id_str),
    friendships_destroy: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/destroy.json'),
        method: 'POST',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1},
        token: ALT_TOKEN
    }, (_, value) => !!value.id_str),
    friendships_update: new Endpoint<boolean, { id: string, retweets?: boolean, device?: boolean }>({
        url: v11('friendships/update.json'),
        method: 'POST',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"cursor":-1},
        token: ALT_TOKEN
    }, (_, value) => !!value.relationship.target.id_str),
    friendships_cancel: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/cancel.json'),
        method: 'POST',
        token: ALT_TOKEN
    }, (_, value) => !!value.id_str),
    friendships_incoming: new Endpoint<{ ids: string[], next_cursor_str: string, previous_cursor_str: string }, { cursor: number }>({
        url: v11('friendships/incoming.json'),
        method: 'GET',
        variables: {"include_profile_interstitial_type":1,"include_blocking":1,"include_blocked_by":1,"include_followed_by":1,"include_want_retweets":1,"include_mute_edge":1,"include_can_dm":1,"include_can_media_tag":1,"include_ext_is_blue_verified":1,"include_ext_verified_type":1,"include_ext_profile_image_shape":1,"skip_status":1,"stringify_ids":true,"count":100},
        token: ALT_TOKEN
    }, (_, value) => value as { ids: string[], next_cursor_str: string, previous_cursor_str: string }),
    friendships_accept: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/accept.json'),
        method: 'POST',
        token: ALT_TOKEN
    }, (_, value) => !!value.id_str),
    friendships_deny: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('friendships/deny.json'),
        method: 'POST',
        token: ALT_TOKEN
    }, (_, value) => !!value.id_str),
    blocks_create: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('blocks/create.json', false),
        method: 'POST'
    }, (_, value) => !!value.id_str),
    blocks_destroy: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('blocks/destroy.json', false),
        method: 'POST'
    }, (_, value) => !!value.id_str),
    mutes_users_create: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('mutes/users/create.json'),
        method: 'POST',
        token: ALT_TOKEN
    }, (_, value) => !!value.id_str),
    mutes_users_destroy: new Endpoint<boolean, { user_id: string } | { screen_name: string }>({
        url: v11('mutes/users/destroy.json'),
        method: 'POST',
        token: ALT_TOKEN
    }, (_, value) => !!value.id_str)
} as const) satisfies Record<string, Endpoint<any> | EndpointGroup>;
