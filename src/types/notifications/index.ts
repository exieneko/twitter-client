import type { Tweet, User } from '../index.js';

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
     * Text contained in the notification, if applicable  
     * In the case of Birdwatch notifications, the text contains a preview for the note
     */
    text?: string,
    type: NotificationType,
    /** Array of tweets that are important to this notification */
    tweets: Tweet[],
    /** Array of users that are important to this notification */
    users: User[]
}

/**
 * + `NewTweets` - New tweets from users where `User.want_notifications` is `true`
 * + `RecommendedTweets` - Recommended tweets
 * + `Mentioned` - One or more users mentioned you in their tweets
 * + `NewFollowers` - One or more users followed you
 * + `TweetLiked` - One or more users liked your tweet
 * + `TweetRetweeted` - One or more users retweeted your tweet
 * + `RetweetLiked` - One or more users liked a tweet you retweeted
 * + `RetweetRetweeted` - One or more users retweeted a tweet you also retweeted
 * + `AddedToList` - A user added you to their list - the name of the list will be included in `text`
 * + `ListSubscribedTo` - One or more users subscribed to your list - the name of the list will be included in `text`
 * + `PollFinished` - A poll you created has finished
 * + `BirdwatchNoteNeedsHelp` - A Birdwatch note needs your help in getting displayed on a Tweet - a preview of the note's text will be included in `text`
 * + `BirdwatchNoteRatedHelpful` - A Birdwatch note you rated helpful has been displayed on a tweet - a preview of the note's text will be included in `text`
 * + `BirdwatchNoteRatedNotHelpful` - A Birdwatch note you rated not helpful has been displayed on a tweet - a preview of the note's text will be included in `text`
 * + `BirdwatchNoteRatedDeleted` - A tweet on which you rated a Birdwatch note has been deleted by the author - a preview of the note's text will be included in `text`
 * + `LoggedIn` - Your account has been logged into
 * + `ReportReceived` - Your report was received by Twitter
 * + `ReportUpdate` - Your report was received by Twitter - the result of the report will be included in `text`
 * + `Advertisement` - Advertisement for Twitter Blue
 * + `Unknown` - Fallback
 */
export type NotificationType =
    'NewTweets' | 'RecommendedTweets' |
    'Mentioned' | 'NewFollowers' | 'TweetLiked' | 'TweetRetweeted' | 'RetweetLiked' | 'RetweetRetweeted' | 'AddedToList' | 'ListSubscribedTo' | 'PollFinished' | 
    'BirdwatchNoteNeedsHelp' | 'BirdwatchNoteRatedHelpful' | 'BirdwatchNoteRatedNotHelpful' | 'BirdwatchNoteRatedDeleted' |
    'LoggedIn' | 'ReportReceived' | 'ReportUpdate' | 'Advertisement' | 'Unknown'
;

/**
 * Represents unread notifications counter
 */
export interface UnreadCount {
    notifications: number,
    inbox: number
}
