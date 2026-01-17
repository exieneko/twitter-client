import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag } from '../index.js';

export interface ByUsername {
    byUsername?: boolean
}

export interface BlockedAccountsGetArgs extends CursorOnly {
    imported?: boolean
}

export type Visibility = 'private' | 'followers' | 'following' | 'mutuals' | 'public';

export interface UpdateProfileArgs {
    name: string,
    description: string,
    location: string,
    url: string,
    birthday: Date,
    birthYearVisibility: Visibility,
    birthDayVisibility: Visibility
}

export interface BirdwatchRateNoteArgs {
    tweetId: string,
    helpful_tags?: BirdwatchHelpfulTag[],
    unhelpful_tags?: BirdwatchUnhelpfulTag[]
}

export interface CommunityTimelineGetArgs {
    sort?: 'relevant' | 'recent'
}

export interface CursorOnly {
    cursor?: string
}

export interface ListBySlug {
    bySlug?: boolean
}

export interface ListCreateArgs {
    name: string,
    description?: string,
    private?: boolean
}

export interface NotificationGetArgs extends CursorOnly {
    type: 'all' | 'verified' | 'mentions'
}

export interface SearchArgs extends CursorOnly {
    type?: 'algorithmical' | 'chronological' | 'media' | 'users' | 'lists'
}

export interface TimelineGetArgs extends CursorOnly {
    type?: 'algorithmical' | 'chronological',
    seenTweetIds?: string[]
}

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

export type TweetReplyPermission = 'following' | 'verified' | 'mentioned' | 'none';

export interface TweetGetArgs extends CursorOnly {
    sort?: 'relevant' | 'recent' | 'likes'
}

export interface UnsentTweetsGetArgs {
    ascending?: boolean
}

export interface MediaUploadArgs {
    contentType: string,
    altText?: string,
    segmentSizeOverride?: number
}
