import type { Enum, Tweet, Type, User } from '../index.js';

/**
 * A Twitter notification
 */
export interface Notification extends Type<'Notification'> {
    id: string,
    created_at: string,
    /** Id of the primary object in a notification, like a tweet or Birdwatch note */
    object_id?: string,
    /** Possible text content of this notification. May not be applicable for all notification types. In the case of Birdwatch notifications, the text contains a preview for the note */
    text?: string,
    kind: NotificationKind,
    /** Array of tweets that are important to this notification */
    tweets: Tweet[],
    /** Array of users that are important to this notification */
    users: User[]
}

/**
 * Kind of notifications
 * 
 * @enum
 */
export const NotificationKind = {
    /** New tweets were made by users who you enabled notifications from */
    NewTweets: 'NewTweets',
    /** A tweet is recommended to you */
    RecommendedTweets: 'RecommendedTweets',

    /** You were mentioned in a tweet */
    Mentioned: 'Mentioned',
    /** Users followed you */
    NewFollowers: 'NewFollowers',
    /** Users liked your tweet */
    TweetLiked: 'TweetLiked',
    /** Users retweeted your tweet */
    TweetRetweeted: 'TweetRetweeted',
    /** Users liked your retweet */
    RetweetLiked: 'RetweetLiked',
    /** Users retweeted your retweet */
    RetweetRetweeted: 'RetweetRetweeted',
    /** You were added to a list */
    AddedToList: 'AddedToList',
    /** Users subscribed to your list */
    ListSubscribedTo: 'ListSubscribedTo',
    /** A poll you created has finished */
    PollFinished: 'PollFinished',

    /** A Birdwatch note needs your help. Only possible if you're a Birdwatch contributor and have notifications enabled */
    BirdwatchNoteNeedsHelp: 'BirdwatchNoteNeedsHelp',
    /** A Birdwatch note you rated helpful reached Helpful status */
    BirdwatchNoteRatedHelpful: 'BirdwatchNoteRatedHelpful',
    /** A Birdwatch note you rated not helpful reached Not Helpful status */
    BirdwatchNoteRatedNotHelpful: 'BirdwatchNoteRatedNotHelpful',
    /** A tweet you rated a Birdwatch note on was deleted */
    BirdwatchNoteRatedDeleted: 'BirdwatchNoteRatedDeleted',

    /** New session */
    LoggedIn: 'LoggedIn',
    /** Report successfully submitted */
    ReportReceived: 'ReportReceived',
    /** Report concluded */
    ReportUpdate: 'ReportUpdate',
    /** Advertisement for Twitter Blue as a notification */
    Advertisement: 'Advertisement',
    Unknown: 'Unknown'
} as const;
export type NotificationKind = Enum<typeof NotificationKind>;

/**
 * Unread notifications counter
 */
export interface UnreadCount {
    notifications: number,
    inbox: number
}
