import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag } from './birdwatch.js';

export * from './account.js';
export * from './birdwatch.js';
export * from './community.js';
export * from './list.js';
export * from './notifications.js';
export * from './search.js';
export * from './tweet.js';
export * from './user.js';

/**
 * Response tuple containing `errors` and `data` if the errors aren't fatal
 * 
 * # Examples
 * 
 * Destructure tuple and handle errors before handling data:
 * 
 * ```ts
 * const [errors, entries] = await twitter.getTimeline();
 * 
 * if (!errors.length) {
 *     console.error(`errors: ${errors}`);
 *     return;
 * }
 * 
 * console.log(entries!.map(entry => entry.content));
 * ```
 * 
 * Or just assume there are no errors:
 * 
 * ```ts
 * const [, user] = await twitter.getUser('123456');
 * console.log(user?.name);
 * ```
 */
export type ClientResponse<T> = [ClientError[], T?];

/**
 * 
 */
export interface ClientError {
    code: number,
    message?: string
}



/**
 * Represents any timeline entry
 */
export interface Entry<T> {
    id: string,
    content: T
}

/**
 * Represents a timeline cursor\
 * The direction shows where the timeline continues from
 */
export interface Cursor {
    __typename: 'Cursor',
    direction: CursorDirection,
    value: string
}

export enum CursorDirection {
    Top = 'Top',
    Bottom = 'Bottom',
    ShowMore = 'ShowMore',
    ShowSpam = 'ShowMoreThreads'
}



export interface ByUsername {
    byUsername?: boolean
}

export interface BlockedAccountsGetArgs extends CursorOnly {
    imported?: boolean
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
    text: string,
    mediaIds?: string[],
    sensitive?: boolean,
    replyPermission?: TweetReplyPermission
}

export type TweetReplyPermission = 'following' | 'verified' | 'mentioned' | 'none';

export interface TweetGetArgs extends CursorOnly {
    sort?: 'relevant' | 'recent' | 'likes'
}

export interface MediaUploadArgs {
    contentType: string,
    segmentSizeOverride?: number
}
