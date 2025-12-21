import type { Cursor, Tweet, User } from './index.js';

/**
 * Represents a Twitter notification
 */
export interface Notification {
    __typename: 'Notification',
    id: string,
    /** The list's creation datetime as an ISO string */
    created_at: string,
    /** Id of the primary object in a notification, like a tweet or Birdwatch note */
    objectId?: string,
    /**
     * Text contained in the notification, if applicable\
     * In the case of Birdwatch notifications, the text contains a preview for the note
     */
    text?: string,
    type: NotificationKind,
    /** Array of tweets that are important to this notification */
    tweets: Tweet[],
    /** Array of users that are important to this notification */
    users: User[]
}

export enum NotificationKind {
    /** New tweets from users where `User.want_notifications` is `true` */
    NewTweets = 'NewTweets',
    /**
     * Recommended tweets
     * @deprecated this enum member may be removed in a later version due to recommended tweets always being irrelevant
     */
    RecommendedTweets = 'RecommendedTweets',

    /** One or more users mentioned you in their tweets */
    Mentioned = 'Mentioned',
    /** One or more users followed you */
    NewFollowers = 'NewFollowers',
    /** One or more users liked your tweet */
    TweetLiked = 'TweetLiked',
    /** One or more users retweeted your tweet */
    TweetRetweeted = 'TweetRetweeted',
    /** One or more users liked a tweet you retweeted */
    RetweetLiked = 'RetweetLiked',
    /** One or more users retweeted a tweet you also retweeted */
    RetweetRetweeted = 'RetweetRetweeted',
    /**
     * A user added you to their list\
     * The name of the list will be included in `text`
     */
    AddedToList = 'AddedToList',
    /**
     * One or more users subscribed to your list\
     * The name of the list will be included in `text`
     */
    ListSubscribedTo = 'ListSubscribedTo',
    /** A poll you created has finished */
    PollFinished = 'PollFinished',

    /**
     * A Birdwatch note needs your help in getting displayed on a Tweet
     * A preview of the note's text will be included in `text`
     */
    BirdwatchNoteNeedsHelp = 'BirdwatchNoteNeedsHelp',
    /**
     * A Birdwatch note you rated helpful has been displayed on a tweet
     * A preview of the note's text will be included in `text`
     */
    BirdwatchNoteRatedHelpful = 'BirdwatchNoteRatedHelpful',
    /**
     * A Birdwatch note you rated not helpful has been displayed on a tweet
     * A preview of the note's text will be included in `text`
     */
    BirdwatchNoteRatedNotHelpful = 'BirdwatchNoteRatedNotHelpful',
    /**
     * A tweet on which you rated a Birdwatch note has been deleted by the author
     * A preview of the note's text will be included in `text`
     */
    BirdwatchNoteRatedDeleted = 'BirdwatchNoteRatedDeleted',

    /** Your account has been logged into */
    LoggedIn = 'LoggedIn',
    /** Your report was received by Twitter */
    ReportReceived = 'ReportReceived',
    /**
     * Your report was received by Twitter\
     * The result of the report will be included in `text`
     */
    ReportUpdate = 'ReportUpdate',
    /** Advertisement for Twitter Blue */
    Advertisement = 'Advertisement',
    /** Fallback for unknown notifications */
    Unknown = 'Unknown'
}

/**
 * Union type representing all notification types that can be present in a timeline
 */
export type TimelineNotification = Notification | Cursor;

/**
 * Represents unread notifications counter
 */
export interface UnreadCount {
    notifications: number,
    inbox: number
}
