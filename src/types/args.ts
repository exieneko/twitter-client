import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag, TweetReplyPermission, Tweet } from './index.js';
import type { Enum } from './utils.js';

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
 * 
 * @enum
 */
export const BirthDateVisibility = {
    /** Only you can see your birth date */
    Private: 'Private',
    /** Only people that follow you can see your birth date */
    Followers: 'Followers',
    /** Only people you follow can see your birth date */
    Following: 'Following',
    /** Only your mutuals can see your birth date */
    Mutuals: 'Mutuals',
    /** Everyone can see your birth date */
    Public: 'Public'
} as const;
export type BirthDateVisibility = Enum<typeof BirthDateVisibility>;

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
 * 
 * @enum
 */
export const BirdwatchNoteSource = {
    /** Note coming from your timeline */
    Timeline: 'Timeline',
    /** Note coming from the "needs your help" timeline */
    NeedsYourHelp: 'NeedsYourHelp'
} as const;
export type BirdwatchNoteSource = Enum<typeof BirdwatchNoteSource>;

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
 * 
 * @enum
 */
export const CommunityTweetsOrder = {
    /** Popular tweets first */
    Relevant: 'Relevant',
    /** New tweets first */
    Latest: 'Latest'
} as const;
export type CommunityTweetsOrder = Enum<typeof CommunityTweetsOrder>;

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
 * 
 * @enum
 */
export const NotificationTimelineFilter = {
    /** Only notifications from verified users */
    Verified: 'Verified',
    /** Only notifications that mention you */
    Mentions: 'Mentions',
    /** All notifications */
    None: 'None'
} as const;
export type NotificationTimelineFilter = Enum<typeof NotificationTimelineFilter>

/**
 * Arguments for getting notifications
 */
export interface NotificationGetArgs extends CursorOnly, Filter<NotificationTimelineFilter> {}

/**
 * Search timeline kind
 * 
 * @enum
 * @default SearchOrder.Relevant
 */
export const SearchOrder = {
    /** Most relevant tweet results */
    Relevant: 'Relevant',
    /** Latest tweet results */
    Latest: 'Latest'
} as const;
export type SearchOrder = Enum<typeof SearchOrder>;

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
export type SearchTweetArgs = SearchArgs & OrderBy<SearchOrder>;

/**
 * Home timeline order
 * 
 * @enum
 * @default TimelineType.Algorithmical
 */
export const TimelineType = {
    /** Algorithmical timeline */
    Algorithmical: 'Algorithmical',
    /** Chronological timeline */
    Chronological: 'Chronolocial'
} as const;
export type TimelineType = Enum<typeof TimelineType>;

/**
 * Arguments for getting a timeline
 */
export interface TimelineGetArgs extends CursorOnly {
    type?: TimelineType,
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
    /**
     * Card content of the tweet
     * 
     * @deprecated Use `poll` instead
     */
    card?: {
        type: 'Poll'
    } & TweetCreateArgs['poll'],
    /** Tweet content disclosures */
    contentDisclosures?: Partial<Tweet['contentDisclosures']>,
    /**
     * Media ids to attach to the tweet
     * 
     * @deprecated `media` is preferred instead
     */
    mediaIds?: string[],
    media?: TweetCreateMediaArgs[],
    poll?: {
        /** Duration in seconds */
        duration: number,
        /** 2-4 choices */
        choices: {
            text: string,
            /** If the poll should have images with the choices, add a media id to all choices */
            mediaId?: string
        }[]
    },
    /** Tweet id to reply to */
    replyTo?: string,
    /** Control who can reply to this tweet */
    replyPermission?: TweetReplyPermission,
    /** Mark this tweet as sensitive? */
    sensitive?: boolean
}

/**
 * Arguments for adding additional tweets in reply to a root tweet
 */
export type ThreadTweetArgs = Pick<TweetCreateArgs, 'text' | 'media' | 'mediaIds'>;

export interface TweetCreateMediaArgs {
    id: string,
    altText?: string,
    taggedUsers?: string[]
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
 * 
 * @enum
 */
export const TweetOrder = {
    /** Replies are ordered algorithmically, with followed users being at the top */
    Relevant: 'Relevant',
    /** Newest replies first */
    New: 'New',
    /** Most liked replies first */
    Likes: 'Likes'
} as const;
export type TweetOrder = Enum<typeof TweetOrder>;

/**
 * Arguments for getting a tweet
 */
export type TweetGetArgs = CursorOnly & OrderBy<TweetOrder>;

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
 * 
 * @enum
 */
export const TranslationItemType = {
    Tweet: 'Tweet',
    Description: 'Description',
    BirdwatchNote: 'BirdwatchNote'
} as const;
export type TranslationItemType = Enum<typeof TranslationItemType>;

/**
 * Arguments for uploading a new media
 * 
 * @deprecated Using the mime type string instead of `{ contentType: string }` is preferred
 */
export interface MediaUploadArgs {
    /** Mime type of the media */
    contentType: string,
    /**
     * ALT text to describe the media. Not supported for videos and gifs
     * 
     * @deprecated Alt text is no longer created at media upload. Use with `createTweet` or `createMetadata` instead
     */
    altText?: string,
    /**
     * Override the default segment size. Reducing the number will increase the amount of requests made
     * 
     * @default 1048576
     * @deprecated You probably don't want to override this
     */
    segmentSizeOverride?: number
}

/**
 * Arguments for adding metadata to an uploaded media
 */
export interface MediaMetadataCreateArgs {
    /** ALT text to describe the media. Not supported for videos and gifs */
    altText?: string,
    allowDownload?: boolean
}

/**
 * Arguments for getting a user's tweets
 */
export type UserTweetsGetArgs = CursorOnly & OrderBy<UserTweetsOrder> & Filter<UserTweetsFilter>;

/**
 * Filter user tweets timeline
 * 
 * @enum
 * @default UserTweetsFilter.Primary
 */
export const UserTweetsFilter = {
    /** Include tweets and retweets (`UserTweets`) */
    Primary: 'Primary',
    /** Include tweets, replies, and retweets (`UserTweetsAndReplies`) */
    All: 'All',
    /** Include original tweets (`UserOriginalsTimeline`) */
    Tweets: 'Tweets',
    /** Include only highlighted tweets (`UserHighlightsTweets`) */
    Highlights: 'Highlights',
    /**
     * Include only replies (`UserRepliesTimeline`)
     * 
     * @deprecated Moved to its own method `getUserReplies`
     */
    Replies: 'Replies',
    /**
     * Include only retweets (`UserRepostsTimeline`)
     * 
     * @deprecated Moved to its own method `getUserRetweets`
     */
    Retweets: 'Retweets'
} as const;
export type UserTweetsFilter = Enum<typeof UserTweetsFilter>;

/**
 * Order user tweets by amount of likes. Not allowed for `UserTweetsFilter.Legacy`
 * 
 * @enum
 * @default UserTweetsOrder.New
 */
export const UserTweetsOrder = {
    New: 'New',
    Likes: 'Likes'
} as const;
export type UserTweetsOrder = Enum<typeof UserTweetsOrder>;

/**
 * Arguments for getting a user's media tweets
 */
export type UserMediaGetArgs = CursorOnly & Filter<UserMediaFilter>;

/**
 * Filter user media tweets timeline
 * 
 * @enum
 * @default UserMediaFilter.All
 */
export const UserMediaFilter = {
    /** Include all media (`UserMedia`) */
    All: 'All',
    /** Include only images (`UserPhotoTimeline`) */
    Images: 'Images',
    /** Include only videos (`UserVideoTimeline`) */
    Videos: 'Videos'
} as const;
export type UserMediaFilter = Enum<typeof UserMediaFilter>;
