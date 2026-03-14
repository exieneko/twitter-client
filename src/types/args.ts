import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag, ReplyPermission, Tweet } from './index.js';
import type { Enum } from './internal.js';

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
    /** @default */
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
    helpful_tags?: BirdwatchHelpfulTag[],
    /** Tags showing why this note should not be displayed */
    unhelpful_tags?: BirdwatchUnhelpfulTag[],
    source?: BirdwatchNoteSource
}

/**
 * Order options for community tweets
 * 
 * @enum
 */
export const CommunityTweetsOrder = {
    /** Popular tweets first */
    Relevance: 'Relevance',
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
    /** All notifications
     * 
     * @default
     */
    None: 'None'
} as const;
export type NotificationTimelineFilter = Enum<typeof NotificationTimelineFilter>;

/**
 * Arguments for getting notifications
 */
export interface NotificationGetArgs extends CursorOnly, Filter<NotificationTimelineFilter> {}

/**
 * Search timeline kind
 * 
 * @enum
 */
export const SearchKind = {
    /**
     * Most relevant tweet results
     * 
     * @default
     */
    Relevant: 'Relevant',
    /** Latest tweet results */
    Latest: 'Latest',
    /** Most relevant tweets containing media */
    Media: 'Media',
    /** Most relevant users */
    Users: 'Users',
    /** Most relevant lists */
    Lists: 'Lists'
} as const;
export type SearchKind = Enum<typeof SearchKind>;

/**
 * Arguments for searching tweets
 */
export interface SearchArgs extends CursorOnly {
    kind?: SearchKind,
    /** Source for the search. Should be `typed_query` in almost all cases */
    source?: 'typed_query' | 'recent_search_click'
}

/**
 * Home timeline order
 * 
 * @enum
 */
export const TimelineKind = {
    /**
     * Algorithmical timeline
     * 
     * @default
     */
    Automatic: 'Automatic',
    /** Chronological timeline */
    Latest: 'Latest'
} as const;
export type TimelineKind = Enum<typeof TimelineKind>;

/**
 * Arguments for getting a timeline
 */
export interface TimelineGetArgs extends CursorOnly, OrderBy<TimelineKind> {
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
    /** 1-based index of the selected choice (1-4) */
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
        kind: 'Poll',
        duration: number,
        choices: {
            text: string,
            media_id?: string
        }[]
    },
    /** Tweet content disclosures */
    content_disclosures?: Partial<Tweet['content_disclosures']>,
    /** Tweet id to reply to */
    replyTo?: string,
    /** Media ids to attach to the tweet. Tweets with over 4 medias can only be sent as a note tweet */
    mediaIds?: string[],
    /** Mark this tweet as sensitive? */
    sensitive?: boolean,
    /** Control who can reply to this tweet */
    replyPermission?: ReplyPermission
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
 * 
 * @enum
 */
export const TweetOrder = {
    /** Replies are ordered algorithmically, with followed users being at the top */
    Relevance: 'Relevance',
    /** Newest replies first */
    New: 'New',
    /** Most liked replies first */
    Likes: 'Likes'
} as const;
export type TweetOrder = Enum<typeof TweetOrder>;

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
     * @default 1_084_576
     */
    segmentSizeOverride?: number
}

/**
 * Arguments for getting a user's tweets
 */
export interface UserTweetsGetArgs extends CursorOnly {
    /** Include user replies? */
    replies?: boolean
}
