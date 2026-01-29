import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag } from '../../types/index.js';


export interface CursorOnly {
    cursor?: string
}

export interface BySlug {
    bySlug?: boolean
}

export interface ByUsername {
    byUsername?: boolean
}



export interface BlockedAccountsGetArgs extends CursorOnly {
    imported?: boolean
}

export type BirthDateVisibility = 'Private' | 'Followers' | 'Following' | 'Mutuals' | 'Public';
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

export type CommunitySort = 'Relevant' | 'Recent';
export interface CommunityTimelineGetArgs extends CursorOnly {
    sort?: CommunitySort
}

export interface ListCreateArgs {
    name: string,
    description?: string,
    private?: boolean
}

export type NotificationTimelineType = 'All' | 'Verified' | 'Mentions';
export interface NotificationGetArgs extends CursorOnly {
    type?: NotificationTimelineType
}

export type SearchTimelineType = 'Relevant' | 'Latest' | 'Media' | 'Users' | 'Lists';
export interface SearchArgs extends CursorOnly {
    type?: SearchTimelineType
}

export type TimelineType = 'Algorithmical' | 'Chronological';
export interface TimelineGetArgs extends CursorOnly {
    type?: TimelineType,
    seenTweetIds?: string[]
}

export type TweetReplyPermission = 'Following' | 'Verified' | 'Mentioned' | 'None';
export interface TweetCreateArgs {
    text?: string,
    replyTo: string,
    mediaIds?: string[],
    sensitive?: boolean,
    replyPermission?: TweetReplyPermission,
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


export type TweetSort = 'Relevant' | 'Recent' | 'Likes';
export interface TweetGetArgs extends CursorOnly {
    sort?: TweetSort
}

export interface UnsentTweetsGetArgs {
    ascending?: boolean
}

export interface MediaUploadArgs {
    contentType: string,
    altText?: string,
    segmentSizeOverride?: number
}
