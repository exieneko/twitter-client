import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag, Enum } from './index.js';

export interface CursorOnly {
    cursor?: string
}

export interface BySlug {
    bySlug?: boolean
}

export interface ByUsername {
    byUsername?: boolean
}

export interface Filter<T extends string> {
    filter?: T
}

export interface OrderBy<T extends string> {
    orderBy?: T
}



export interface BlockedAccountsGetArgs extends CursorOnly {
    imported?: boolean
}

export const BirthDateVisibility = {
    Private: 'Private',
    Followers: 'Followers',
    Following: 'Following',
    Mutuals: 'Mutuals',
    Public: 'Public'
} as const;
export type BirthDateVisibility = Enum<typeof BirthDateVisibility>;

export interface UpdateProfileArgs {
    name: string,
    description: string,
    location: string,
    url: string,
    birthday: Date,
    birthYearVisibility: BirthDateVisibility,
    birthDayVisibility: BirthDateVisibility
}

export interface BirdwatchRateNoteArgs {
    tweetId: string,
    helpful_tags?: BirdwatchHelpfulTag[],
    unhelpful_tags?: BirdwatchUnhelpfulTag[]
}

export const CommunityTweetsOrder = {
    Relevance: 'Relevance',
    New: 'New'
} as const;
export type CommunityTweetsOrder = Enum<typeof CommunityTweetsOrder>;

export interface CommunityTimelineGetArgs extends CursorOnly, OrderBy<CommunityTweetsOrder> {}

export interface ListCreateArgs {
    name: string,
    description?: string,
    private?: boolean
}

export const NotificationTimelineFilter = {
    Verified: 'Verified',
    Mentions: 'Mentions',
    None: 'None'
} as const;
export type NotificationTimelineFilter = Enum<typeof NotificationTimelineFilter>;

export interface NotificationGetArgs extends CursorOnly, Filter<NotificationTimelineFilter> {}

export const SearchKind = {
    Relevant: 'Relevant',
    Latest: 'Latest',
    Media: 'Media'
} as const;
export type SearchKind = Enum<typeof SearchKind>;

export interface SearchArgs extends CursorOnly {
    kind?: SearchKind
}

export const TimelineKind = {
    Algorithmical: 'Algorithmical',
    Chronological: 'Chronological'
} as const;
export type TimelineKind = Enum<typeof TimelineKind>;

export type TimelineGetArgs = ({
    kind?: TimelineKind,
    seenTweetIds?: string[]
} | {
    id: string
}) & CursorOnly;

export interface TweetVoteArgs {
    tweetId: string,
    cardUri: string,
    cardName: string,
    choice: number
}

export const ReplyPermission = {
    Everyone: 'Everyone',
    Following: 'Following',
    Mentioned: 'Mentioned',
    Verified: 'Verified'
} as const;
export type ReplyPermission = Enum<typeof ReplyPermission>;

export interface TweetCreateArgs {
    text?: string,
    card?: {
        type: 'Poll',
        duration: number,
        choices: {
            text: string,
            media_id?: string
        }[]
    },
    replyTo: string,
    mediaIds?: string[],
    sensitive?: boolean,
    replyPermission?: ReplyPermission,
}

export interface ScheduledTweetCreateArgs {
    sendAt: Date | number,
    text?: string,
    mediaIds?: string[],
}

export interface ThreadTweetArgs {
    text?: string,
    mediaIds?: string[]
}

export const TweetOrder = {
    Relevance: 'Relevance',
    New: 'New',
    Likes: 'Likes'
} as const;
export type TweetOrder = Enum<typeof TweetOrder>;

export interface TweetGetArgs extends CursorOnly, OrderBy<TweetOrder> {}

export interface UnsentTweetsGetArgs {
    ascending?: boolean
}

export interface MediaUploadArgs {
    contentType: string,
    altText?: string,
    segmentSizeOverride?: number
}

export interface UserTweetsGetArgs extends CursorOnly {
    replies?: boolean
}
