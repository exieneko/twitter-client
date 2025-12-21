import { Entry, Retweet, TimelineTweet, Tweet, TweetMedia, TweetPlatform, TweetTombstone, TweetUnavailableReason, TweetVideo, User } from '../types/index.js';
import { cursor, getEntries, user, userLegacy } from './index.js';

export function tweet(value: any, options?: { hasHiddenReplies?: boolean }): Tweet | Retweet | TweetTombstone {
    if (!value) {
        return {
            __typename: 'TweetTombstone',
            reason: TweetUnavailableReason.Unavailable
        };
    }

    const t = value.__typename === 'TweetWithVisibilityResults' ? value.tweet : value;

    if (t.__typename === 'TweetUnavailable' || t.__typename === 'TweetTombstone') {
        const text: string = t.tombstone?.text?.text?.toLowerCase();

        return {
            __typename: 'TweetTombstone',
            reason: text.includes('estimates your age')
                ? TweetUnavailableReason.AgeVerificationRequired
            : text.includes('limits who can view their')
                ? TweetUnavailableReason.AuthorProtected
            : text.includes('suspended')
                ? TweetUnavailableReason.AuthorSuspended
            : text.includes('no longer exists')
                ? TweetUnavailableReason.AuthorUnavailable
            : text.includes('violated')
                ? TweetUnavailableReason.ViolatedRules
            : text.includes('withheld')
                ? TweetUnavailableReason.Withheld
            : text.includes('deleted')
                ? TweetUnavailableReason.Deleted
                : TweetUnavailableReason.Unavailable
        };
    }

    if (t.legacy.retweeted_status_result?.result) {
        return {
            __typename: 'Retweet',
            id: t.rest_id,
            tweet: tweet(t.legacy.retweeted_status_result.result) as Tweet,
            user: user(t.core.user_results.result) as User
        };
    }

    function getText(t: any) {
        return ((t.note_tweet?.note_tweet_results?.result?.text || t.legacy.full_text || '') as string).replace(
            /\bhttps:\/\/t\.co\/[a-zA-Z0-9]+/,
            sub => t.legacy.entities.urls?.find((x: any) => x.url === sub)?.expanded_url || sub
        );
    }

    const tweetMedia = (t.legacy.entities.media as {}[])?.map(media) ?? [];

    const s: string | undefined = t.source.includes('Twitter Web') ? 'web' : t.source.match(/>Twitter\s(.*?)</)?.at(1);
    const source = s?.startsWith('for ') ? s.slice(4) : s;

    return {
        __typename: 'Tweet',
        id: t.rest_id,
        author: user(t.core.user_results.result) as User,
        birdwatch_note: t.birdwatch_pivot?.note?.rest_id ? {
            id: t.birdwatch_pivot.note.rest_id,
            text: (t.birdwatch_pivot.subtitle.entities as { fromIndex: number, toIndex: number, ref: { url: string } }[])
                .toSorted((a, b) => b.fromIndex - a.fromIndex)
                .reduce((acc, e) => acc.slice(0, e.fromIndex) + e.ref.url + acc.slice(e.toIndex), t.birdwatch_pivot.subtitle.text),
            lang: t.birdwatch_pivot.note.language || 'en',
            translatable: !!t.birdwatch_pivot.note.is_community_note_translatable,
            public: t.birdwatch_pivot.visualStyle === 'Default' || t.birdwatch_pivot.title.includes('added context')
        } : undefined,
        bookmarked: !!t.legacy.bookmarked,
        bookmarks_count: t.legacy.bookmark_count || 0,
        created_at: new Date(t.legacy.created_at).toISOString(),
        editing: {
            allowed: !!t.edit_control?.is_edit_eligible,
            allowed_until: new Date(Number(t.edit_control?.editable_until_msecs) || 0).toISOString(),
            remaining_count: t.edit_control?.edits_remaining,
            tweet_ids: t.edit_control?.edit_tweet_ids
        },
        expandable: !!t.note_tweet?.is_expandable,
        has_ai_generated_image: tweetMedia.some(media => media.ai_generated),
        has_birdwatch_note: !!t.has_birdwatch_notes,
        has_grok_chat_embed: !!t.grok_share_attachment,
        has_hidden_replies: !!options?.hasHiddenReplies,
        has_quoted_tweet: !!t.legacy.is_quote_status,
        lang: t.legacy.lang,
        liked: !!t.legacy.favorited,
        likes_count: t.legacy.favorite_count || 0,
        media: tweetMedia,
        platform: (() => {
            switch (source?.toLowerCase()) {
                case 'web':
                    return TweetPlatform.Web
                case 'android':
                    return TweetPlatform.Android
                case 'iphone':
                    return TweetPlatform.IPhone
                case 'ipad':
                    return TweetPlatform.IPad
                default:
                    return TweetPlatform.Other
            }
        })(),
        quote_tweets_count: t.legacy.quote_count || 0,
        quoted_tweet: t.quoted_status_result?.result
            ? tweet(t.quoted_status_result?.result) as Tweet
            : undefined,
        quoted_tweet_id: t.legacy.quoted_status_id_str,
        replies_count: t.legacy.reply_count || 0,
        replying_to_username: t.legacy.in_reply_to_screen_name,
        retweeted: !!t.legacy.retweeted,
        retweets_count: t.legacy.retweet_count || 0,
        text: !!t.legacy.entities.media?.length
            ? getText(t).replace(/https:\/\/t\.co\/.+$/, '').trimEnd()
            : getText(t),
        translatable: !!t.translatable,
        views_count: t.views.count ? Number(t.views.count) : undefined
    };
}

export function media(value: any): TweetMedia {
    const common = {
        id: value.id_str,
        ai_generated: !!value.media_results?.result?.grok_image_annotation,
        alt_text: value.ext_alt_text || undefined,
        available: value.ext_media_availability?.status === 'Available',
        size: {
            width: value.original_info.width,
            height: value.original_info.height
        }
    };

    if (value.type !== 'photo') {
        const variants: TweetVideo['variants'] = value.video_info?.variants || [];

        return {
            __typename: value.type === 'video' ? 'Video' : 'Gif',
            aspect_ratio: value.video_info?.aspect_ratio ?? [1, 1],
            duration: value.video_info?.duration_millis || 0,
            thumbnail_url: value.media_url_https,
            url: variants.at(-1)?.url!,
            variants,
            ...common
        };
    }

    return {
        __typename: 'Image',
        url: value.media_url_https,
        ...common
    };
}



export function tweetLegacy(tweet: any, author: any, quotedTweet?: any, quotedTweetAuthor?: any): Tweet {
    const tweetMedia = (tweet.extended_entities.media as {}[])?.map(media) ?? [];

    return {
        __typename: 'Tweet',
        id: tweet.id_str,
        author: userLegacy(author),
        bookmarked: !!tweet.bookmarked,
        bookmarks_count: tweet.bookmark_count || 0,
        created_at: new Date(tweet.created_at).toISOString(),
        editing: {
            allowed: false,
            allowed_until: new Date(0).toISOString(),
            remaining_count: 0,
            tweet_ids: [tweet.id_str]
        },
        expandable: false,
        has_ai_generated_image: tweetMedia.some(media => media.ai_generated),
        has_birdwatch_note: !!tweet.has_birdwatch_notes,
        has_grok_chat_embed: false,
        has_hidden_replies: false,
        has_quoted_tweet: !!tweet.is_quote_status,
        lang: tweet.lang,
        liked: !!tweet.favorited,
        likes_count: tweet.favorite_count || 0,
        media: tweetMedia,
        platform: TweetPlatform.Web,
        quote_tweets_count: tweet.quote_count || 0,
        quoted_tweet: quotedTweet && quotedTweetAuthor ? tweetLegacy(quotedTweet, quotedTweetAuthor) : undefined,
        quoted_tweet_id: tweet.quoted_status_id_str || undefined,
        replies_count: tweet.reply_count || 0,
        replying_to_username: tweet.in_reply_to_screen_name || undefined,
        retweeted: !!tweet.retweeted,
        retweets_count: tweet.retweet_count || 0,
        text: tweet.full_text,
        translatable: !!tweet.translatable
    };
}



export function entry(value: any): Entry<TimelineTweet> | undefined {
    if (value.content.__typename === 'TimelineTimelineCursor') {
        return {
            id: value.entryId,
            content: cursor(value.content)
        };
    }

    if (value.content.__typename === 'TimelineTimelineItem' && !value.entryId.includes('promoted') && value.entryId.includes('tweet')) {
        return {
            id: value.entryId,
            content: tweet(value.content.itemContent.tweet_results?.result, {
                hasHiddenReplies: value.content.itemContent.hasModeratedReplies
            })
        };
    }

    if (value.content.__typename === 'TimelineTimelineModule' && value.entryId.includes('conversation')) {
        if (value.content.items.at(0)?.entryId.includes('promoted')) {
            return;
        }

        return {
            id: value.entryId,
            content: {
                __typename: 'Conversation',
                items: value.content.items.map((item: any) => item.item.itemContent.__typename === 'TimelineTimelineCursor'
                    ? cursor(item.item.itemContent)
                    : (tweet(item.item.itemContent.tweet_results?.result, {
                        hasHiddenReplies: item.item.itemContent.hasModeratedReplies
                    }) as Tweet | TweetTombstone)
                )
            }
        };
    }
}

export function entries(instructions: any): Entry<TimelineTweet>[] {
    return getEntries(instructions).map(entry).filter(x => !!x) as any;
}

export function mediaEntries(instructions: any, gridModule?: { content: object, key: string }): Entry<TimelineTweet>[] {
    const value: any[] = getEntries(instructions);

    const grid = gridModule?.content ?? value.find(entry => entry.content.__typename === 'TimelineTimelineModule')?.content;

    return [
        ...value.filter(entry => entry.content.__typename === 'TimelineTimelineCursor').map(entry => ({
            id: entry.entryId,
            content: cursor(entry.content)
        })),
        ...(
            grid
                ? grid[gridModule?.key ?? 'items'].map((item: any) => ({
                    id: item.entryId,
                    content: item.item.itemContent.__typename === 'TimelineTimelineCursor'
                        ? cursor(item.item.itemContent)
                        : tweet(item.item.itemContent.tweet_results?.result, {
                            hasHiddenReplies: item.item.itemContent.hasModeratedReplies
                        })
                }))
                : []
        )
    ];
}
