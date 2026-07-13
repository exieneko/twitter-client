import { TweetKind, UserKind, type Tweet, type User } from './index.js';
import type { Enum, MaybeType, Model, Type } from './internal/index.js';
import { match } from '../utils/index.js';

/**
 * A Twitter notification
 */
export interface Notification extends Type<'Notification'> {
    id: bigint,
    createdAt: string,
    /** Id of the primary object in a notification, like a tweet or Birdwatch note */
    objectId?: string,
    /** Possible text content of this notification. May not be applicable for all notification types. In the case of Birdwatch notifications, the text contains a preview for the note */
    text?: string,
    kind: NotificationKind,
    /** Array of tweets that are important to this notification */
    tweets: Tweet[],
    /** Array of users that are important to this notification */
    users: User[]
}
export const Notification: Model<Notification, Record<string, any>, { kind: NotificationKind }> = {
    async new(fmt, value, opts) {
        const _t = await fmt.next(TweetKind, value.tweet_results?.result);
        const tweet = _t.__typename === 'Tweet' ? _t : undefined;

        const objectId = match(opts.kind, [
            [NotificationKind.Mentioned, tweet?.id],
            [[NotificationKind.TweetLiked, NotificationKind.TweetRetweeted, NotificationKind.RetweetLiked, NotificationKind.RetweetRetweeted], value.template?.target_objects?.at(0)?.result?.rest_id],
            [[NotificationKind.AddedToList, NotificationKind.ListSubscribedTo], value.notification_url?.url?.match(/list\/(\d+?)$/)?.at(1)],
            [[NotificationKind.BirdwatchNoteNeedsHelp, NotificationKind.BirdwatchNoteRatedHelpful, NotificationKind.BirdwatchNoteRatedNotHelpful, NotificationKind.BirdwatchNoteRatedDeleted], value?.rich_message?.text, value.notification_url?.url?.match(/birdwatch\/n\/(\d+?)(\?src|$)/)?.at(1)]
        ]);

        const tweets = await Promise.all(
            (value.template?.target_objects as MaybeType[] || [])
                .filter(x => x?.__typename === 'TimelineNotificationTweetRef')
                .map(x => fmt.nextIf(TweetKind, x?.result))
        );

        const users = await Promise.all(
            (value.template?.from_users as MaybeType[] || [])
                .map(x => fmt.nextIf(UserKind, x?.user_results?.result))
        );

        return {
            __typename: 'Notification',
            id: BigInt(value.id || tweet?.id),
            createdAt: new Date(value.timestamp_ms).toISOString(),
            objectId,
            text: match(opts.kind, [
                [NotificationKind.AddedToList, NotificationKind.ListSubscribedTo, value.rich_message?.text?.match(/List\s(.*?)$/)?.at(1)],
                [[NotificationKind.BirdwatchNoteNeedsHelp, NotificationKind.BirdwatchNoteRatedHelpful, NotificationKind.BirdwatchNoteRatedNotHelpful, NotificationKind.BirdwatchNoteRatedDeleted], value.template?.additional_context?.text],
                [NotificationKind.ReportUpdate, value?.rich_message?.text]
            ]),
            kind: opts.kind,
            tweets: tweets.filter(tweet => tweet?.__typename === 'Tweet'),
            users: users.filter(user => user?.__typename === 'User')
        };
    }
};

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
export interface UnreadCount extends Type<'UnreadCount'> {
    notifications: number,
    inbox: number
}
export const UnreadCount: Model<UnreadCount, Record<string, number>> = {
    async new(_, value) {
        return {
            __typename: 'UnreadCount',
            notifications: value.ntab_unread_count || 0,
            inbox: value.dm_unread_count || value.xchat_unread_count || 0
        };
    }
};
