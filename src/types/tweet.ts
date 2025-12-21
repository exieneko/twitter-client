import type { Cursor, User } from './index.js';

/**
 * Represents a single tweet
 */
export interface Tweet {
    __typename: 'Tweet',
    id: string,
    author: User,
    /** Birdwatch note on this tweet, if it exists */
    birdwatch_note?: {
        id: string,
        /**
         * The full text of the note\
         * Any `t.co` urls can't be converted to the actual url they redirect to unless the note is fetched by its id
         */
        text: string,
        lang: string,
        translatable: boolean,
        /** Whether or not this note is publicly displayed on the tweet. It can only be `false` if you are a Birdwatch contributor */
        public: boolean
    },
    /** Whether or not you bookmarked the tweet */
    bookmarked: boolean,
    /** Amount of users that bookmarked the tweet */
    bookmarks_count: number,
    // card: {},
    // community: {},
    /** The tweet's creation datetime as an ISO string */
    created_at: string,
    editing: {
        allowed: boolean,
        allowed_until: string,
        remaining_count: number,
        tweet_ids: Array<string>
    },
    /** Whether or not if the tweet is so long that the full text is not displayed normally. `this.text` will still contain all text */
    expandable: boolean,
    /** Whether or not any media in the tweet is labelled as ai generated */
    has_ai_generated_image: boolean,
    /** Whether or not the tweet has an active or pending Birdwatch note */
    has_birdwatch_note: boolean,
    /** Whether or not the tweet has a preview of a chat with Grok */
    has_grok_chat_embed: boolean,
    /** Whether or not the hidden replies badge should be displayed on a tweet. A tweet may have hidden replies even if this is `false` because Twitter is dumb */
    has_hidden_replies: boolean,
    /** Whether or not the tweet is quoting another tweet */
    has_quoted_tweet: boolean,
    lang: string,
    /** Whether or not you liked the tweet */
    liked: boolean,
    /** Amount of users that liked the tweet */
    likes_count: number,
    media: Array<TweetMedia>,
    /** The platform the tweet has posted from */
    platform: TweetPlatform,
    /** Amount of users that are quote tweeting the tweet */
    quote_tweets_count: number,
    /**
     * The quoted tweet, if it exists
     * 
     * May be undefined even if `this.has_quoted_tweet && this.quoted_tweet_id !== undefined`, to avoid infinite recursion\
     * Also, on rare occasions where the author of the quoted tweet has blocked the author of this tweet,
     * this property may be `undefined` even though `this.quoted_tweet_id` will still show the id of the quoted tweet, but it must be fetched again
     */
    quoted_tweet?: Tweet,
    /** Id of the quoted tweet, if it exists */
    quoted_tweet_id?: string,
    /** Amount of users that replied to the tweet */
    replies_count: number,
    /** The \@username of the user the tweet is in reply to */
    replying_to_username?: string,
    /** Whether or not you retweeted the tweet */
    retweeted: boolean,
    /** Amount of users that retweeted the tweet */
    retweets_count: number,
    text: string,
    translatable: boolean,
    /** Amount of views the tweet has. May be `undefined` if the tweet predates view tracking */
    views_count?: number
}

export enum TweetPlatform {
    Web = 'Web',
    Android = 'Android',
    IPhone = 'IPhone',
    IPad = 'IPad',
    Other = 'Other'
}



export interface TweetImage {
    __typename: 'Image',
    id: string,
    /** Whether or not the media has an AI-generated note on it */
    ai_generated: boolean,
    /** Alt text set on the media by the author of the tweet */
    alt_text?: string,
    /** Whether or not the media is available to view. May be `false` if the media has been deleted or copyright claimed */
    available: boolean,
    /** Original width and height of the media */
    size: {
        width: number,
        height: number
    },
    /** Url of the image, or shorthand for the highest quality video variant */
    url: string
}

export interface TweetVideo extends Omit<TweetImage, '__typename'> {
    __typename: 'Video',
    aspect_ratio: [number, number],
    /** Duration in milliseconds, may be `0` on gifs */
    duration: number,
    /** Url for the video's thumbnail */
    thumbnail_url: string,
    /** Variants for all video's qualities, from lowest to highest */
    variants: Array<{
        bitrate?: number,
        content_type: string,
        url: string
    }>
}

export interface TweetGif extends Omit<TweetVideo, '__typename'> {
    __typename: 'Gif'
}

/** Union type of tweet media kinds */
export type TweetMedia = TweetImage | TweetGif | TweetVideo;



/**
 * Represents a retweet in a timeline that points to another tweet
 */
export interface Retweet {
    __typename: 'Retweet',
    id: string,
    tweet: Tweet,
    user: User
}



/**
 * Represents a conversation that can contain multiple tweets
 */
export interface Conversation {
    __typename: 'Conversation',
    items: Array<Tweet | TweetTombstone | Cursor>
}



/**
 * Represents a deleted or unavailable tweet
 */
export interface TweetTombstone {
    __typename: 'TweetTombstone',
    /** Reason for the tweet's unavailability */
    reason: TweetUnavailableReason
}

export enum TweetUnavailableReason {
    /** Age verification is required to view this tweet, as it may be sensitive. Unlike blurred media marked sensitive, this is server-side and depends on your IP address */
    AgeVerificationRequired = 'AgeVerificationRequired',
    /** The author has protected their tweets and you don't follow them */
    AuthorProtected = 'AuthorProtected',
    /** The author has been suspended */
    AuthorSuspended = 'AuthorSuspended',
    /** The author is unavailable, likely because they deactivated */
    AuthorUnavailable = 'AuthorUnavailable',
    /** Tweet deleted by the author */
    Deleted = 'Deleted',
    /** Tweet violated the Twitter rules and was removed */
    ViolatedRules = 'ViolatedRules',
    /** Tweet withheld in your country (dependent on IP address) or all countries */
    Withheld = 'Withheld',
    Unavailable = 'Unavailable'
}

/**
 * Union type representing all tweet types that can be present in a timeline
 */
export type TimelineTweet = Tweet | Retweet | Conversation | TweetTombstone | Cursor;
