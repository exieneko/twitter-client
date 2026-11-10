import type { CardResult, CommunityResult, Cursor, TweetMedia, User } from './index.js';
import type { Type } from './utils.js';

/**
 * Timeline tweet. If the tweet is a reply under the currently focused tweet, it will be a `Conversation` instead
 * 
 * @see {@link Conversation}
 */
export interface Tweet extends Type<'Tweet'> {
    id: string,
    author: User,
    /** Birdwatch note on the tweet */
    birdwatchNote?: {
        id: string,
        /** The full text of the note */
        text: string,
        translation?: {
            text: string,
            /** Destination language */
            language: string
        },
        language: string,
        isTranslatable: boolean,
        /** Whether the note is publicly displayed on the tweet. It can only be `false` if the authenticated user is a Birdwatch contributor */
        isPublic: boolean
    },
    /** Whether the authenticated user has bookmarked the tweet */
    isBookmarked: boolean,
    bookmarksCount: number,
    card?: CardResult,
    /** Community the tweet was created in */
    community?: CommunityResult,
    /** Content disclosures applied to the tweet by its author */
    contentDisclosures: {
        isAiGenerated: boolean,
        isSponsored: boolean
    },
    createdAt: string,
    /** Whether the authenticated user has downvoted the tweet */
    isDownvoted: boolean,
    editing: {
        isAllowed: boolean,
        allowedUntil?: string,
        remainingCount: number,
        /** The current id of this tweet and ids of all previous edits */
        tweetIds: string[]
    },
    /** Full text content of the tweet as received from the API. Includes conversation user mentions in the beginning, quote tweet and media urls */
    fullText: string,
    /** Whether the tweet has an active or pending Birdwatch note */
    hasBirdwatchNote: boolean,
    /** Whether the tweet has a Grok conversation embed */
    hasGrokChatEmbed: boolean,
    /** Whether the tweet is a quote tweet of another tweet */
    hasQuotedTweet: boolean,
    /** Whether the tweet can be expanded in official Twitter clients. A tweet is considered expandable if it exceeds the normal 280 character limit, making it a note tweet */
    isExpandable: boolean,
    isTranslatable: boolean,
    /** Whether Twitter restricted this tweet due to it being hateful. This normally disables all interaction options in official Twitter clients */
    isVisibilityRestricted: boolean,
    language: string,
    /** Whether the authenticated user liked the tweet */
    isLiked: boolean,
    likesCount: number,
    media: TweetMedia[],
    /**
     * The platform the tweet has posted from
     * 
     * @deprecated the Twitter API no longer reports tweet sources. This property will be removed in the future, but it defaults to "Twitter Web App" for now
     */
    source: string,
    /** Amount of users that are quote tweeting the tweet */
    quoteTweetsCount: number,
    /**
     * The quoted tweet, if it exists
     * 
     * To avoid too many recursions, the Twitter API caps quote tweet nesting at 2. Twitter also won't send this data if the quoted tweet's author has blocked the author of the tweet quoting it. `quotedTweetId` will contain the id regardless
     */
    quotedTweet?: Tweet,
    /** Id of the quoted tweet, if it exists */
    quotedTweetId?: string,
    /** Amount of users that replied to the tweet */
    repliesCount: number,
    /** Reply permission controlling who can reply to the tweet */
    replyPermission: TweetReplyPermission,
    replyingTo?: {
        /** Id of the tweet the tweet is in reply to */
        tweetId: string,
        /** User id of the user the tweet is in reply to */
        userId: string,
        /** Username of the user the tweet is in reply to */
        username: string
    },
    /** Whether the authenticated user has retweeted the tweet */
    isRetweeted: boolean,
    retweetsCount: number,
    /** Text content of the tweet stripped on unnecessary data */
    text: string,
    /** Auto-translated text of the tweet to the authenticated user's language */
    translation?: {
        text: string,
        /** Destination language */
        language: string
    },
    /** Amount of views the tweet has. Tweets created before views were added don't track views */
    viewsCount?: number,
    /** Visibility restriction applied by Twitter */
    visibilityRestriction?: {
        type?: TweetRestrictionType,
        reason?: TweetRestrictionReason
    }
}

/**
 * Retweet that contains the retweeted tweet within
 */
export interface Retweet extends Type<'Retweet'> {
    id: string,
    tweet: Tweet,
    user: User
}

/**
 * Conversation that can contain multiple tweets
 */
export interface Conversation extends Type<'Conversation'> {
    allTweetIds: string[],
    items: (Tweet | TweetTombstone | Cursor)[]
}

/**
 * A deleted or unavailable tweet that's represented with a tombstone in official Twitter clients
 */
export interface TweetTombstone extends Type<'TweetTombstone'> {
    /** Reason for the tweet's unavailability */
    reason: TweetUnavailableReason,
    /** Message returned by the API */
    message?: string
}

export type TweetResult = Tweet | Retweet | Conversation | TweetTombstone;



export interface DraftTweet extends Type<'DraftTweet'> {
    id: string,
    attachmentUrl?: string,
    text: string,
    mediaIds: string[],
    thread: {
        text: string,
        mediaIds: string[]
    }[]
}

export interface ScheduledTweet extends Omit<DraftTweet, '__typename'>, Type<'ScheduledTweet'> {
    sendAt: string
}



/**
 * Tweet unavailability reasons
 * 
 * @default TweetUnavailableReason.Unavailable
 */
export enum TweetUnavailableReason {
    /** Legal ID verification is required to view this tweet. Restricted server-side */
    AgeVerificationRequired = 'AgeVerificationRequired',
    /** Author has protected their tweets */
    AuthorProtected = 'AuthorProtected',
    /** Author has been suspended */
    AuthorSuspended = 'AuthorSuspended',
    /** Author has deactivated or is otherwise unavailable */
    AuthorUnavailable = 'AuthorUnavailable',
    /** Tweet has been deleted */
    Deleted = 'Deleted',
    /** Tweet has been removed because it violated Twitter's rules */
    ViolatedRules = 'ViolatedRules',
    /** Tweet has been withheld in the country of the authenticated user or all countries */
    Withheld = 'Withheld',
    /** Fallback */
    Unavailable = 'Unavailable'
}

/**
 * Tweet restriction types
 */
export enum TweetRestrictionType {
    /** Tweet visibility is restricted and interactions are disabled */
    Full = 'Full',
    /** Tweet visibility is restricted, but users can still interact with the tweet */
    Partial = 'Partial'
}

/**
 * Reason for why a restriction was applied to a tweet
 * 
 * @default TweetRestrictionReason.Other
 */
export enum TweetRestrictionReason {
    Abuse = 'Abuse',
    HatefulConduct = 'HatefulConduct',
    ViolentSpeech = 'ViolentSpeech',
    /** Tweet violated Twitter's rules, but was not removed because of "public interest" */
    ViolatedRulesPublicInterest = 'ViolatedRulesPublicInterest',
    /** Fallback */
    Other = 'Other'
}

/**
 * Tweet conversation control options
 * 
 * @default ReplyPermission.Everyone
 */
export enum TweetReplyPermission {
    /** Everyone can reply */
    Everyone = 'Everyone',
    /** Only people you follow can reply */
    Following = 'Following',
    /** Only your mutuals can reply */
    Mutuals = 'Mutuals',
    /** Only people you mentioned can reply */
    Mentioned = 'Mentioned',
    /** Only verified users can reply */
    Verified = 'Verified'
}
