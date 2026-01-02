import type { Entry, Notification, TimelineNotification, TimelineTweet, UnreadCount, User } from '../types/index.js';
import { CursorDirection, NotificationKind } from '../types/index.js';
import { cursor, getEntries, tweet as formatTweet, tweetLegacy, user } from './index.js';

export function unreadCount(value: any): UnreadCount {
    return {
        notifications: value.ntab_unread_count || 0,
        inbox: value.dm_unread_count || 0
    };
}

export function notification(value: any, notificationKind: string): Notification {
    const type = (() => {
        switch (notificationKind) {
            case 'device_follow_tweet_notification_entry':
                return NotificationKind.NewTweets;
            case 'generic_magic_rec_pyle_recommended':
                return NotificationKind.RecommendedTweets;

            case 'users_mentioned_you':
                return NotificationKind.Mentioned;
            case 'users_followed_you':
                return NotificationKind.NewFollowers;
            case 'users_liked_your_tweet':
                return NotificationKind.TweetLiked;
            case 'users_retweeted_your_tweet':
                return NotificationKind.TweetRetweeted;
            case 'users_liked_your_retweet':
                return NotificationKind.RetweetLiked;
            case 'users_retweeted_your_tweet':
                return NotificationKind.RetweetRetweeted;
            case 'users_added_you_to_lists':
                return NotificationKind.AddedToList;
            case 'users_subscribed_to_your_list':
                return NotificationKind.ListSubscribedTo;
            case 'generic_poll_voter_summary':
                return NotificationKind.PollFinished;

            case 'generic_birdwatch_needs_your_help':
                return NotificationKind.BirdwatchNoteNeedsHelp;
            case 'generic_birdwatch_helpful_valid_rater':
                return NotificationKind.BirdwatchNoteRatedHelpful;
            case 'generic_birdwatch_not_helpful_valid_rater':
                return NotificationKind.BirdwatchNoteRatedNotHelpful;
            case 'generic_birdwatch_delete_post_rater':
                return NotificationKind.BirdwatchNoteRatedDeleted;

            case 'generic_login_notification':
                return NotificationKind.LoggedIn;
            case 'generic_report_received':
                return NotificationKind.ReportReceived;
            case 'generic_report_update':
                return NotificationKind.ReportUpdate;
            case 'generic_subscription_promotion_premium':
                return NotificationKind.Advertisement;
            default:
                return NotificationKind.Unknown;
        }
    })();

    const _t = type === NotificationKind.Mentioned ? formatTweet(value.tweet_results.result) : undefined
    const tweet = _t?.__typename === 'Tweet' ? _t : undefined;

    return {
        __typename: 'Notification',
        id: value.id || tweet?.id,
        created_at: new Date(value.timestamp_ms).toISOString(),
        objectId: type === NotificationKind.Mentioned
            ? tweet?.id
        : [NotificationKind.TweetLiked, NotificationKind.TweetRetweeted, NotificationKind.RetweetLiked, NotificationKind.RetweetRetweeted].includes(type)
            ? value.template?.target_objects?.at(0)?.result?.rest_id
        : [NotificationKind.AddedToList, NotificationKind.ListSubscribedTo].includes(type)
            ? value.notification_url?.url?.match(/lists\/(\d+?)$/)?.at(1)
        : type.startsWith('Birdwatch')
            ? value.notification_url?.url?.match(/birdwatch\/n\/(\d+?)(\?src|$)/)?.at(1)
        : type === NotificationKind.ReportUpdate
            ? value?.rich_message?.text
            : undefined,
        text: [NotificationKind.AddedToList, NotificationKind.ListSubscribedTo].includes(type)
            ? value.rich_message?.text?.match(/List\s(.*?)$/)?.at(1)
        : type.startsWith('Birdwatch')
            ? value.template?.additional_context?.text
        : type === NotificationKind.ReportUpdate
            ? value?.rich_message?.text
            : undefined,
        type,
        tweets: tweet ?? (value.template?.target_objects || [])
            .filter((x: any) => x.__typename === 'TimelineNotificationTweetRef')
            .map((x: any) => formatTweet(x.result)),
        users: (value.template?.from_users || [])
            .map((x: any) => user(x.user_results.result) as User)
    };
}

export function notificationEntries(instructions: any): Entry<TimelineNotification>[] {
    const value: any[] = getEntries(instructions);

    return value.map(entry => ({
        id: entry.entryId,
        content: entry.content?.__typename === 'TimelineTimelineCursor'
            ? cursor(entry.content)
            : notification(entry.content.itemContent, entry.content.clientEventInfo.element)
    }));
}

export function deviceFollowEntries(value: any[], globalObjects: any): Entry<TimelineTweet>[] {
    return value.map(entry => {
        if (Object.hasOwn(entry.content, 'operation')) {
            const cursor = entry.content.operation.cursor;

            return {
                id: entry.entryId,
                content: {
                    __typename: 'Cursor',
                    direction: cursor.cursorType === 'Top' ? CursorDirection.Top : CursorDirection.Bottom,
                    value: cursor.value
                }
            };
        }

        const tweetId = entry.content.item.content.tweet.id;

        const tweet = globalObjects.tweets[tweetId];
        const author = globalObjects.users[tweet.user_id_str];
        const quotedTweet = tweet.quoted_status_id_str ? globalObjects.tweets[tweet.quoted_status_id_str] : undefined;
        const quotedTweetAuthor = quotedTweet ? globalObjects.users[quotedTweet.user_id_str] : undefined;

        return {
            id: entry.entryId,
            content: tweetLegacy(tweet, author, quotedTweet, quotedTweetAuthor)
        };
    });
}
