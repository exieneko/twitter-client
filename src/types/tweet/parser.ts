import { match } from '../../utils/index.js';
import { type DraftTweet, type Entry, type Media, type Retweet, type ScheduledTweet, type Slice, type TweetKind, type Tweet, type TweetMedia, type TweetTombstone, type TweetVideo, type User, type Cursor, type CardKind, type CardImage, TweetMediaAvailability, TweetUnavailableReason, ReplyPermission } from '../index.js';
import * as p from '../parsers.js';

export function tweet(value: any): Tweet | Retweet | TweetTombstone {
    if (!value) {
        return {
            __typename: 'TweetTombstone',
            reason: TweetUnavailableReason.Unavailable
        };
    }

    if (value.__typename === 'TweetUnavailable') {
        return {
            __typename: 'TweetTombstone',
            reason: match(value.reason, [
                // TODO
                ['Suspended', TweetUnavailableReason.AuthorSuspended]
            ], TweetUnavailableReason.Unavailable)
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
            id: BigInt(t.rest_id),
            tweet: tweet(t.legacy.retweeted_status_result.result) as Tweet,
            user: p.user(t.core.user_results.result) as User
        };
    }

    function getText(t: any) {
        return ((t.note_tweet?.note_tweet_results?.result?.text || t.legacy.full_text || '') as string).replace(
            /\bhttps:\/\/t\.co\/[a-zA-Z0-9_-]+/,
            sub => t.legacy.entities.urls?.find((x: any) => x.url === sub)?.expanded_url || sub
        );
    }

    const editControl = t.edit_control?.edit_control_initial ?? t.edit_control;
    const tweetMedia = (t.legacy.entities.media as {}[])?.map(media) ?? [];

    return {
        __typename: 'Tweet',
        id: BigInt(t.rest_id),
        author: p.user(t.core.user_results.result) as User,
        birdwatchNote: t.birdwatch_pivot?.note?.rest_id ? {
            id: BigInt(t.birdwatch_pivot.note.rest_id),
            text: (t.birdwatch_pivot.subtitle.entities as { fromIndex: number, toIndex: number, ref: { url: string } }[])
                .toSorted((a, b) => b.fromIndex - a.fromIndex)
                .reduce((acc, e) => acc.slice(0, e.fromIndex) + e.ref.url + acc.slice(e.toIndex), t.birdwatch_pivot.subtitle.text),
            language: t.birdwatch_pivot.note.language || 'en',
            isTranslatable: !!t.birdwatch_pivot.note.is_community_note_translatable,
            isPublic: t.birdwatch_pivot.visualStyle === 'Default' || t.birdwatch_pivot.title.includes('added context')
        } : undefined,
        bookmarked: !!t.legacy.bookmarked,
        bookmarksCount: t.legacy.bookmark_count || 0,
        card: card(t.card?.legacy),
        community: !!t.author_community_relationship?.community_results?.result ? p.community(t.author_community_relationship.community_results.result) : undefined,
        createdAt: new Date(t.legacy.created_at).toISOString(),
        contentDisclosures: {
            isAiGenerated: !!t.content_disclosure?.ai_generated_disclosure?.has_ai_generated_media,
            isSponsored: !!t.content_disclosure?.advertising_disclosure?.is_paid_promotion
        },
        editing: {
            isAllowed: !!editControl?.is_edit_eligible,
            allowedUntil: new Date(Number(editControl?.editable_until_msecs) || 0).toISOString(),
            remainingCount: Number(editControl?.edits_remaining || '0'),
            tweetIds: (editControl?.edit_tweet_ids || []).map(BigInt)
        },
        isExpandable: !!t.note_tweet?.is_expandable,
        isTranslatable: !!t.is_translatable,
        isVisibilityRestricted: value.tweetInterstitial?.__typename === 'ContextualTweetInterstitial',
        hasBirdwatchNote: !!t.has_birdwatch_notes,
        hasGrokChatEmbed: !!t.grok_share_attachment,
        hasQuotedTweet: !!t.legacy.is_quote_status,
        language: t.legacy.lang,
        liked: !!t.legacy.favorited,
        likesCount: t.legacy.favorite_count || 0,
        media: tweetMedia,
        source: t.source.match(/>(.*?)</)?.at(1) || t.source,
        quoteTweetsCount: t.legacy.quote_count || 0,
        quotedTweet: t.quoted_status_result?.result
            ? tweet(t.quoted_status_result?.result) as Tweet
            : undefined,
        quotedTweetId: t.legacy.quoted_status_id_str
            ? BigInt(t.legacy.quoted_status_id_str)
            : undefined,
        repliesCount: t.legacy.reply_count || 0,
        replyPermission: match(t.legacy.conversation_control?.policy as string | undefined, [
            ['Community', ReplyPermission.Following],
            ['Verified', ReplyPermission.Verified],
            ['ByInvitation', ReplyPermission.Mentioned]
        ], ReplyPermission.Everyone),
        replyingTo: t.legacy.in_reply_to_status_id_str ? {
            tweetId: BigInt(t.legacy.in_reply_to_status_id_str),
            username: t.legacy.in_reply_to_screen_name
        } : undefined,
        retweeted: !!t.legacy.retweeted,
        retweetsCount: t.legacy.retweet_count || 0,
        text: !!t.legacy.entities.media?.length
            ? getText(t).replace(/https:\/\/t\.co\/.+$/, '').trimEnd()
            : getText(t),
        viewsCount: t.views.count ? Number(t.views.count) : undefined
    };
}

export function media(value: any): TweetMedia {
    const common = {
        id: BigInt(value.id_str),
        altText: value.ext_alt_text || undefined,
        availability: match(value.ext_media_availability?.reason, [
            [undefined, TweetMediaAvailability.Available],
            ['DMCAed', TweetMediaAvailability.Copyright],
            ['Geoblocked', TweetMediaAvailability.GeoBlocked],
        ], TweetMediaAvailability.Other),
        isAiGenerated: !!value.media_results?.result?.grok_image_annotation,
        size: {
            width: value.original_info.width,
            height: value.original_info.height
        }
    } satisfies Partial<TweetMedia>;

    if (value.type !== 'photo') {
        const variants: TweetVideo['variants'] = value.video_info?.variants || [];

        return {
            __typename: value.type === 'video' ? 'Video' : 'Gif',
            aspectRatio: value.video_info?.aspect_ratio ?? [1, 1],
            duration: value.video_info?.duration_millis || 0,
            thumbnailUrl: value.media_url_https,
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
        id: BigInt(tweet.id_str),
        author: p.userLegacy(author),
        bookmarked: !!tweet.bookmarked,
        bookmarksCount: tweet.bookmark_count || 0,
        createdAt: new Date(tweet.created_at).toISOString(),
        contentDisclosures: {
            isAiGenerated: false,
            isSponsored: false
        },
        editing: {
            isAllowed: false,
            remainingCount: 0,
            tweetIds: [BigInt(tweet.id_str)]
        },
        isExpandable: false,
        isTranslatable: !!tweet.translatable,
        isVisibilityRestricted: false,
        hasBirdwatchNote: !!tweet.has_birdwatch_notes,
        hasGrokChatEmbed: false,
        hasQuotedTweet: !!tweet.is_quote_status,
        language: tweet.lang,
        liked: !!tweet.favorited,
        likesCount: tweet.favorite_count || 0,
        media: tweetMedia,
        source: tweet.source,
        quoteTweetsCount: tweet.quote_count || 0,
        quotedTweet: quotedTweet && quotedTweetAuthor ? tweetLegacy(quotedTweet, quotedTweetAuthor) : undefined,
        quotedTweetId: tweet.quoted_status_id_str || undefined,
        repliesCount: tweet.reply_count || 0,
        replyPermission: match(tweet.conversation_control?.policy as string | undefined, [
            ['Community', ReplyPermission.Following],
            ['Verified', ReplyPermission.Verified],
            ['ByInvitation', ReplyPermission.Mentioned]
        ], ReplyPermission.Everyone),
        replyingTo: !!tweet.in_reply_to_status_id_str ? {
            tweetId: BigInt(tweet.in_reply_to_status_id_str),
            username: tweet.in_reply_to_screen_name
        } : undefined,
        retweeted: !!tweet.retweeted,
        retweetsCount: tweet.retweet_count || 0,
        text: tweet.full_text
    }
}



export function entry(value: any): Entry<TweetKind | Cursor> | undefined {
    if (value.content.__typename === 'TimelineTimelineCursor') {
        return {
            id: value.entryId,
            content: p.cursor(value.content)
        };
    }

    if (value.content.__typename === 'TimelineTimelineItem' && !value.entryId.includes('promoted') && value.entryId.includes('tweet')) {
        return {
            id: value.entryId,
            content: tweet(value.content.itemContent.tweet_results?.result)
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
                allTweetIds: value.content.metadata?.conversationMetadata?.allTweetIds || [],
                items: value.content.items.map((item: any) => item.item.itemContent.__typename === 'TimelineTimelineCursor'
                    ? p.cursor(item.item.itemContent)
                    : (tweet(item.item.itemContent.tweet_results?.result) as Tweet | TweetTombstone)
                )
            }
        };
    }
}

export function entries(instructions: any): Slice<TweetKind> {
    const entries = p.getEntries(instructions).map(entry).filter(x => !!x);

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}

export function mediaEntries(instructions: any, gridModule?: { content: object, key: string }): Slice<TweetKind> {
    const value: any[] = p.getEntries(instructions);

    const grid = gridModule?.content ?? value.find(entry => entry.content.__typename === 'TimelineTimelineModule')?.content;

    const entries = [
        ...value.filter(entry => entry.content.__typename === 'TimelineTimelineCursor').map(entry => ({
            id: entry.entryId,
            content: p.cursor(entry.content)
        })),
        ...(
            grid
                ? grid[gridModule?.key ?? 'items'].map((item: any) => ({
                    id: item.entryId,
                    content: item.item.itemContent.__typename === 'TimelineTimelineCursor'
                        ? p.cursor(item.item.itemContent)
                        : tweet(item.item.itemContent.tweet_results?.result)
                }))
                : []
        )
    ];

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}



export function draftTweet(value: any): DraftTweet {
    return {
        id: BigInt(value.rest_id),
        text: value.tweet_create_request?.status,
        mediaIds: (value.tweet_create_request?.media_ids || []).map(BigInt),
        thread: (value.tweet_create_request?.thread_tweets || []).map((x: any) => ({
            text: x.status,
            mediaIds: (x.media_ids || []).map(BigInt)
        } satisfies DraftTweet['thread'][number]))
    };
}

export function scheduledTweet(value: any): ScheduledTweet {
    return {
        id: BigInt(value.rest_id),
        sendAt: new Date(value.sceduling_info?.execute_at).toISOString(),
        text: value.tweet_create_request?.status,
        mediaIds: (value.tweet_create_request?.media_ids || []).map(BigInt),
        thread: (value.tweet_create_request?.thread_tweets || []).map((x: any) => ({
            text: x.status,
            mediaIds: (x.media_ids || []).map(BigInt)
        } satisfies ScheduledTweet['thread'][number]))
    };
}



export function card(value: any): CardKind | undefined {
    function get(bindingValues: { key: string, value: { boolean_value?: boolean, string_value?: string, image_value?: CardImage } }[], key: string) {
        return bindingValues.find(v => v.key === key)?.value;
    }

    if (!value) {
        return;
    }

    const bv = value.binding_values;
    const choiceCount = Number(get(bv, 'choice_count')?.string_value || '0');

    const common = {
        cardName: value.name,
        cardUrl: value.url
    } satisfies Partial<CardKind>;

    if (value.name.includes(':audiospace')) {
        return {
            __typename: 'Audiospace',
            author: p.user(value.user_refs_results?.at(0)?.result) as User,
            ...common
        };
    }

    if (value.name.includes(':broadcast')) {
        return {
            __typename: 'Broadcast',
            author: p.user(value.user_refs_results?.at(0)?.result) as User,
            hasEnded: get(bv, 'broadcast_state')?.string_value?.toUpperCase() === 'ENDED',
            id: BigInt(get(bv, 'broadcast_id')?.string_value!),
            mediaId: BigInt(get(bv, 'broadcast_media_id')?.string_value!),
            mediaKey: get(bv, 'broadcast_media_key')?.string_value!,
            thumbnail: get(bv, 'broadcast_thumbnail_original')?.image_value,
            title: get(bv, 'title')?.string_value!,
            width: Number(get(bv, 'broadcast_width')?.string_value || '0'),
            height: Number(get(bv, 'broadcast_height')?.string_value || '0'),
            ...common
        };
    }

    if (value.name.includes(':poll')) {
        let totalVotes = 0;

        return {
            __typename: 'Poll',
            choices: [...Array(choiceCount).keys()].map(i => {
                const votes = Number(get(bv, `choice${i + 1}_count`)?.string_value || '0');
                totalVotes += votes;

                return {
                    text: get(bv, `choice${i + 1}_label`)?.string_value || '',
                    image: get(bv, `choice${i + 1}_image`)?.image_value,
                    votesCount: votes
                };
            }),
            duration: Number(get(bv, 'duration_minutes')?.string_value || '0') * 60,
            endsAt: new Date(get(bv, 'end_datetime_utc')?.string_value || 0).toISOString(),
            totalVotesCount: totalVotes,
            ...common
        };
    }

    if (value.name.includes('summary')) {
        return {
            __typename: 'Embed',
            description: get(bv, 'description')?.string_value || '',
            domain: get(bv, 'domain')?.string_value!,
            thumbnail: get(bv, 'thumbnail_image_original')?.image_value,
            title: get(bv, 'title')?.string_value!,
            ...common
        };
    }
}



export function mediaUpload(value: any): Media {
    return {
        id: BigInt(value.media_id_string),
        mediaKey: value.media_key,
        bytes: value.size || 0,
        contentType: value.image?.image_type || value.video?.video_type || 'image/gif',
        expiresIn: value.expires_after_secs || 0,
        width: value.image?.w,
        height: value.image?.h,
        processing: 'processing_info' in value ? {
            state: value.processing_info?.state || 'pending',
            progress: value.processing_info?.progress_percent ?? 0
        } : undefined
    };
}
