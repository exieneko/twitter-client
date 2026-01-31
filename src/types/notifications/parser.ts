import type { Notification, Slice, TweetKind, UnreadCount, User } from '../index.js';
import * as p from '../parsers.js';

export function unreadCount(value: any): UnreadCount {
    return {
        notifications: value.ntab_unread_count || 0,
        inbox: value.dm_unread_count || value.xchat_unread_count || 0
    };
}

export function notification(value: any, notificationKind: string): Notification {
    const type = (() => {
        switch (notificationKind) {
            case 'device_follow_tweet_notification_entry':
                return 'NewTweets';
            case 'generic_magic_rec_pyle_recommended':
                return 'RecommendedTweets';

            case 'users_mentioned_you':
                return 'Mentioned';
            case 'users_followed_you':
                return 'NewFollowers';
            case 'users_liked_your_tweet':
                return 'TweetLiked';
            case 'users_retweeted_your_tweet':
                return 'TweetRetweeted';
            case 'users_liked_your_retweet':
                return 'RetweetLiked';
            case 'users_retweeted_your_tweet':
                return 'RetweetRetweeted';
            case 'users_added_you_to_lists':
                return 'AddedToList';
            case 'users_subscribed_to_your_list':
                return 'ListSubscribedTo';
            case 'generic_poll_voter_summary':
                return 'PollFinished';

            case 'generic_birdwatch_needs_your_help':
                return 'BirdwatchNoteNeedsHelp';
            case 'generic_birdwatch_helpful_valid_rater':
                return 'BirdwatchNoteRatedHelpful';
            case 'generic_birdwatch_not_helpful_valid_rater':
                return 'BirdwatchNoteRatedNotHelpful';
            case 'generic_birdwatch_delete_post_rater':
                return 'BirdwatchNoteRatedDeleted';

            case 'generic_login_notification':
                return 'LoggedIn';
            case 'generic_report_received':
                return 'ReportReceived';
            case 'generic_report_update':
                return 'ReportUpdate';
            case 'generic_subscription_promotion_premium':
                return 'Advertisement';
            default:
                return 'Unknown';
        }
    })();

    const _t = type === 'Mentioned' ? p.tweet(value.tweet_results.result) : undefined
    const tweet = _t?.__typename === 'Tweet' ? _t : undefined;

    return {
        __typename: 'Notification',
        id: value.id || tweet?.id,
        created_at: new Date(value.timestamp_ms).toISOString(),
        objectId: type === 'Mentioned'
            ? tweet?.id
        : ['TweetLiked', 'TweetRetweeted', 'RetweetLiked', 'RetweetRetweeted'].includes(type)
            ? value.template?.target_objects?.at(0)?.result?.rest_id
        : ['AddedToList', 'ListSubscribedTo'].includes(type)
            ? value.notification_url?.url?.match(/lists\/(\d+?)$/)?.at(1)
        : type.startsWith('Birdwatch')
            ? value.notification_url?.url?.match(/birdwatch\/n\/(\d+?)(\?src|$)/)?.at(1)
        : type === 'ReportUpdate'
            ? value?.rich_message?.text
            : undefined,
        text: ['AddedToList', 'ListSubscribedTo'].includes(type)
            ? value.rich_message?.text?.match(/List\s(.*?)$/)?.at(1)
        : type.startsWith('Birdwatch')
            ? value.template?.additional_context?.text
        : type === 'ReportUpdate'
            ? value?.rich_message?.text
            : undefined,
        type,
        tweets: tweet ?? (value.template?.target_objects || [])
            .filter((x: any) => x.__typename === 'TimelineNotificationTweetRef')
            .map((x: any) => p.tweet(x.result)),
        users: (value.template?.from_users || [])
            .map((x: any) => p.user(x.user_results.result) as User)
    };
}

export function notificationEntries(instructions: any): Slice<Notification> {
    const value: any[] = p.getEntries(instructions);

    return {
        entries: p.sortEntries(value.map(entry => ({
            id: entry.entryId,
            content: entry.content?.__typename === 'TimelineTimelineCursor'
                ? p.cursor(entry.content)
                : notification(entry.content.itemContent, entry.content.clientEventInfo.element)
        })))
    };
}

export function deviceFollowEntries(value: any[], globalObjects: any): Slice<TweetKind> {
    return {
        entries: value.map(entry => {
            if (Object.hasOwn(entry.content, 'operation')) {
                const cursor = entry.content.operation.cursor;

                return {
                    id: entry.entryId,
                    content: {
                        __typename: 'Cursor',
                        direction: cursor.cursorType === 'Top' ? 'Top' : 'Bottom',
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
                content: p.tweetLegacy(tweet, author, quotedTweet, quotedTweetAuthor)
            };
        })
    };
}
