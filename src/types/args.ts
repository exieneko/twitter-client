import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag, TweetReplyPermission, Tweet } from './index.js';

export interface CursorOnly {
    /** Cursor determining where the timeline should continue from */
    cursor?: string
}

/**
 * Arguments for getting a list
 */
export interface BySlug {
    /** Get a list by its slug? */
    bySlug?: boolean
}

/**
 * Arguments for getting a user
 */
export interface ByUsername {
    /** Get a user by their username? */
    byUsername?: boolean
}

export interface Filter<T extends string> {
    /** Apply a filter to the timeline, only returning entries that match */
    filter?: T
}

export interface OrderBy<T extends string> {
    /** Order the timeline's entries */
    orderBy?: T
}



/**
 * Arguments for getting blocked users
 */
export interface BlockedUsersGetArgs extends CursorOnly {
    /** Only get imported blocked accounts? */
    imported?: boolean
}

/**
 * Visibility of your birth date to others
 */
export enum BirthDateVisibility {
    /** Only you can see your birth date */
    Private = 'Private',
    /** Only people that follow you can see your birth date */
    Followers = 'Followers',
    /** Only people you follow can see your birth date */
    Following = 'Following',
    /** Only your mutuals can see your birth date */
    Mutuals = 'Mutuals',
    /** Everyone can see your birth date */
    Public = 'Public'
}

/**
 * Arguments for updating your profile information
 */
export interface UpdateProfileArgs {
    /** Display name (up to 50 characters) */
    name: string,
    description: string,
    location: string,
    /** Valid url to display on your profile */
    url: string,
    /** Your birthday as a `Date`. Time will be ignored */
    birthday: Date,
    /** Control who can see your birth year */
    birthYearVisibility: BirthDateVisibility,
    /** Control who can see your birth month and day */
    birthDayVisibility: BirthDateVisibility
}

/**
 * Source of a Birdwatch note rating
 */
export enum BirdwatchNoteSource {
    /** Note coming from your timeline */
    Timeline = 'Timeline',
    /** Note coming from the "needs your help" timeline */
    NeedsYourHelp = 'NeedsYourHelp'
}

/**
 * Arguments for rating a Birdwatch note
 */
export interface BirdwatchRateNoteArgs {
    /** Tweet id containing the note */
    tweetId: string,
    /** Tags showing why this note should be displayed */
    helpfulTags?: BirdwatchHelpfulTag[],
    /** Tags showing why this note should not be displayed */
    unhelpfulTags?: BirdwatchUnhelpfulTag[],
    source?: BirdwatchNoteSource
}

export interface BirdwatchCreateBatSignalArgs {
    sourceTweetUrl: string,
    text: string
}

/**
 * Order options for community tweets
 */
export enum CommunityTweetsOrder {
    /** Popular tweets first */
    Relevant = 'Relevant',
    /** New tweets first */
    Latest = 'Latest'
}

/**
 * Arguments for getting community tweets
 */
export interface CommunityTweetsGetArgs extends CursorOnly, OrderBy<CommunityTweetsOrder> {}

/**
 * Arguments for creating and updating a list
 */
export interface ListCreateArgs {
    name: string,
    description?: string,
    /** Controls if other people can see this list */
    private?: boolean
}

/**
 * Filter options for notifications
 */
export enum NotificationTimelineFilter {
    /** Only notifications from verified users */
    Verified = 'Verified',
    /** Only notifications that mention you */
    Mentions = 'Mentions',
    /** All notifications */
    None = 'None'
}

/**
 * Arguments for getting notifications
 */
export interface NotificationGetArgs extends CursorOnly, Filter<NotificationTimelineFilter> {}

/**
 * Search timeline kind
 * 
 * @default SearchOrder.Relevant
 */
export enum SearchOrder {
    /** Most relevant tweet results */
    Relevant = 'Relevant',
    /** Latest tweet results */
    Latest = 'Latest'
}

/**
 * Arguments for searching users or lists
 */
export interface SearchArgs extends CursorOnly {
    /** Source for the search. Should be `typed_query` in almost all cases */
    source?: 'typed_query' | 'recent_search_click'
}

/**
 * Arguments for searching tweets
 */
export interface SearchTweetArgs extends SearchArgs, OrderBy<SearchOrder> {}

/**
 * Home timeline order
 * 
 * @default TimelineType.Automatic
 */
export enum TimelineOrder {
    /** Algorithmical timeline */
    Algorithmical = 'Algorithmical',
    /** Chronological timeline */
    Chronological = 'Chronolocial'
}

/**
 * Arguments for getting a timeline
 */
export interface TimelineGetArgs extends CursorOnly, OrderBy<TimelineOrder> {
    /** Tweet ids of already seen tweets */
    seenTweetIds?: string[]
}

/**
 * Arguments for voting on a poll
 */
export interface TweetVoteArgs {
    /** Tweet id the poll is on */
    tweetId: string,
    /** Card uri of the poll */
    cardUri: string,
    /** Card name */
    cardName: string,
    /** 0-based index of the selected choice (0-3) */
    choice: number
}

/**
 * Arguments for creating a tweet
 */
export interface TweetCreateArgs {
    /** Content of the tweet. Defaults to an empty string. Tweets over 280 characters can only be sent as a note tweet */
    text?: string,
    /** Card content of the tweet */
    card?: {
        type: 'Poll',
        duration: number,
        choices: {
            text: string,
            mediaId?: string
        }[]
    },
    /** Tweet content disclosures */
    contentDisclosures?: Partial<Tweet['contentDisclosures']>,
    /** Tweet id to reply to */
    replyTo?: string,
    /** Media ids to attach to the tweet. Tweets with over 4 medias can only be sent as a note tweet */
    mediaIds?: string[],
    /** Mark this tweet as sensitive? */
    sensitive?: boolean,
    /** Control who can reply to this tweet */
    replyPermission?: TweetReplyPermission
}

/**
 * Arguments for adding additional tweets in reply to a root tweet
 */
export interface ThreadTweetArgs {
    /** Content of the tweet. Up to 280 characters */
    text?: string,
    /** Up to 4 media ids to attach to the tweet */
    mediaIds?: string[]
}

/**
 * Arguments for scheduling a tweet
 */
export interface ScheduledTweetCreateArgs extends ThreadTweetArgs {
    /** Date to send the tweet at */
    sendAt: Date | number
}

/**
 * Order replies under a tweet
 */
export enum TweetOrder {
    /** Replies are ordered algorithmically, with followed users being at the top */
    Relevant = 'Relevant',
    /** Newest replies first */
    New = 'New',
    /** Most liked replies first */
    Likes = 'Likes'
}

/**
 * Arguments for getting a tweet
 */
export interface TweetGetArgs extends CursorOnly, OrderBy<TweetOrder> {}

/**
 * Arguments for getting draft tweets
 */
export interface UnsentTweetsGetArgs {
    ascending?: boolean
}

/**
 * Arguments for getting a translation
 */
export interface TranslateArgs {
    /**
     * Type of the item being translated
     * 
     * @default TranslationItemType.Tweet
     */
    type?: TranslationItemType,
    /**
     * Desired language. Defaults to client language if omitted
     * 
     * @default this.options.language
     */
    language?: string
}

/**
 * Items that can be translated
 */
export enum TranslationItemType {
    Tweet = 'Tweet',
    Description = 'Description',
    BirdwatchNote = 'BirdwatchNote'
}

/**
 * Arguments for uploading a new media
 */
export interface MediaUploadArgs {
    /** Mime type of the media */
    contentType: string,
    /** ALT text to add to the media with an additional request */
    altText?: string,
    /**
     * Override the default segment size. Reducing the number will increase the amount of requests made
     * 
     * @default 1048576
     */
    segmentSizeOverride?: number
}

/**
 * Arguments for getting a user's tweets
 */
export type UserTweetsGetArgs = CursorOnly & Filter<UserTweetsFilter>;

/**
 * Filter user tweets timeline
 * 
 * @default UserTweetsFilter.Primary
 */
export enum UserTweetsFilter {
    /** Include tweets and retweets (`UserTweets`) */
    Primary = 'Primary',
    /** Include tweets, replies, and retweets (`UserTweetsAndReplies`) */
    All = 'All',
    /** Include original tweets (`UserOriginalsTimeline`) */
    Tweets = 'Tweets',
    /** Include only replies (`UserRepliesTimeline`) */
    Replies = 'Replies',
    /** Include only retweets (`UserRepostsTimeline`) */
    Retweets = 'Retweets',
    /** Include only highlighted tweets (`UserHighlightsTweets`) */
    Highlights = 'Highlights'
}

/**
 * Arguments for getting a user's media tweets
 */
export type UserMediaGetArgs = CursorOnly & Filter<UserMediaFilter>;

/**
 * Filter user media tweets timeline
 * 
 * @default UserMediaFilter.All
 */
export enum UserMediaFilter {
    /** Include all media (`UserMedia`) */
    All = 'All',
    /** Include only images (`UserPhotoTimeline`) */
    Images = 'Images',
    /** Include only videos (`UserVideoTimeline`) */
    Videos = 'Videos'
}
