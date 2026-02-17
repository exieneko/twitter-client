import { match } from '../../utils/index.js';
import { Cursor, Notification, NotificationKind, Slice, TweetKind, UnreadCount, User } from '../index.js';
import * as p from '../parsers.js';

export function unreadCount(value: any): UnreadCount {
    return {
        notifications: value.ntab_unread_count || 0,
        inbox: value.dm_unread_count || value.xchat_unread_count || 0
    };
}

export function notification(value: any, notificationKind: string): Notification {
    const kind: NotificationKind = match(notificationKind, [
        ['device_follow_tweet_notification_entry', NotificationKind.NewTweets],
        ['generic_magic_rec_pyle_recommended', NotificationKind.RecommendedTweets],
        
        ['users_mentioned_you', NotificationKind.Mentioned],
        ['users_followed_you', NotificationKind.NewFollowers],
        ['users_liked_your_tweet', NotificationKind.TweetLiked],
        ['users_retweeted_your_tweet', NotificationKind.TweetRetweeted],
        ['users_liked_your_retweet', NotificationKind.RetweetLiked],
        ['users_retweeted_your_tweet', NotificationKind.RetweetRetweeted],
        ['users_added_you_to_lists', NotificationKind.AddedToList],
        ['users_subscribed_to_your_list', NotificationKind.ListSubscribedTo],
        ['generic_poll_voter_summary', NotificationKind.PollFinished],
        
        ['generic_birdwatch_needs_your_help', NotificationKind.BirdwatchNoteNeedsHelp],
        ['generic_birdwatch_helpful_valid_rater', NotificationKind.BirdwatchNoteRatedHelpful],
        ['generic_birdwatch_not_helpful_valid_rater', NotificationKind.BirdwatchNoteRatedNotHelpful],
        ['generic_birdwatch_delete_post_rater', NotificationKind.BirdwatchNoteRatedDeleted],
        
        ['generic_login_notification', NotificationKind.LoggedIn],
        ['generic_report_received', NotificationKind.ReportReceived],
        ['generic_report_update', NotificationKind.ReportUpdate],
        ['generic_subscription_promotion_premium', NotificationKind.Advertisement]
    ], NotificationKind.Unknown);

    const _t = kind === NotificationKind.Mentioned ? p.tweet(value.tweet_results.result) : undefined
    const tweet = _t?.__typename === 'Tweet' ? _t : undefined;

    const objectId = match(kind, [
        [NotificationKind.Mentioned, tweet?.id],
        [[NotificationKind.TweetLiked, NotificationKind.TweetRetweeted, NotificationKind.RetweetLiked, NotificationKind.RetweetRetweeted], value.template?.target_objects?.at(0)?.result?.rest_id],
        [[NotificationKind.AddedToList, NotificationKind.ListSubscribedTo], value.notification_url?.url?.match(/list\/(\d+?)$/)?.at(1)],
        [[NotificationKind.BirdwatchNoteNeedsHelp, NotificationKind.BirdwatchNoteRatedHelpful, NotificationKind.BirdwatchNoteRatedNotHelpful, NotificationKind.BirdwatchNoteRatedDeleted], value?.rich_message?.text, value.notification_url?.url?.match(/birdwatch\/n\/(\d+?)(\?src|$)/)?.at(1)]
    ]);

    return {
        __typename: 'Notification',
        id: value.id || tweet?.id,
        created_at: new Date(value.timestamp_ms).toISOString(),
        object_id: objectId,
        objectId,
        text: match(kind, [
            [NotificationKind.AddedToList, NotificationKind.ListSubscribedTo, value.rich_message?.text?.match(/List\s(.*?)$/)?.at(1)],
            [[NotificationKind.BirdwatchNoteNeedsHelp, NotificationKind.BirdwatchNoteRatedHelpful, NotificationKind.BirdwatchNoteRatedNotHelpful, NotificationKind.BirdwatchNoteRatedDeleted], value.template?.additional_context?.text],
            [NotificationKind.ReportUpdate, value?.rich_message?.text]
        ]),
        kind,
        type: kind,
        tweets: tweet ?? (value.template?.target_objects || [])
            .filter((x: any) => x.__typename === 'TimelineNotificationTweetRef')
            .map((x: any) => p.tweet(x.result)),
        users: (value.template?.from_users || [])
            .map((x: any) => p.user(x.user_results.result) as User)
    };
}

export function notificationEntries(instructions: any): Slice<Notification> {
    const value: any[] = p.getEntries(instructions);

    const entries = value.map(entry => ({
        id: entry.entryId,
        content: entry.content?.__typename === 'TimelineTimelineCursor'
            ? p.cursor(entry.content)
            : notification(entry.content.itemContent, entry.content.clientEventInfo.element)
    }));

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}

export function deviceFollowEntries(value: any[], globalObjects: any): Slice<TweetKind> {
    const entries: { id: string, content: TweetKind | Cursor }[] = value.map(entry => {
        if (Object.hasOwn(entry.content, 'operation')) {
            const cursor = entry.content.operation.cursor;

            return {
                id: entry.entryId,
                content: p.cursor(cursor)
            };
        }

        const tweetId = entry.content.item.content.tweet.id;

        const tweet = globalObjects.tweets[tweetId];
        const author = globalObjects.users[tweet.user_id_str];
        const quotedTweet = tweet.quoted_status_id_str ? globalObjects.tweets[tweet.quoted_status_id_str] : undefined;
        const quotedTweetAuthor = quotedTweet ? globalObjects.users[quotedTweet.user_id_str] : undefined;

        return {
            id: entry.entryId,
            content: p.tweetLegacy(tweet, author, quotedTweet, quotedTweetAuthor)
        };
    });

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}
