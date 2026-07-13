import { CardKind, CommunityKind, Cursor, TweetMedia, User } from '../index.js';
import type { Default, Enum, MaybeType, Model, Type, Wrapped } from '../internal/index.js';
import { assert, match } from '../../utils/index.js';

/**
 * A timeline tweet. If this tweet is a reply under the currently focused tweet, it will be a `Conversation` instead
 * 
 * @see {@link Conversation}
 */
export interface Tweet extends Type<'Tweet'> {
    id: bigint,
    author: User,
    /** Birdwatch note on this tweet */
    birdwatchNote?: {
        id: bigint,
        /** The full text of the note */
        text: string,
        language: string,
        /** `true` is the note is written in a different language than the client language, and is a reasonable length */
        isTranslatable: boolean,
        /** `true` if this note is publicly displayed on the tweet. It can only be `false` if you are a Birdwatch contributor */
        isPublic: boolean
    },
    /** `true` if you bookmarked this tweet */
    bookmarked: boolean,
    /** Amount of users that bookmarked this tweet */
    bookmarksCount: number,
    /** Card content of the tweet. Can be an embed, poll, audiospace, etc */
    card?: CardKind,
    /** Community the tweet was created in */
    community?: CommunityKind,
    contentDisclosures: {
        isAiGenerated: boolean,
        isSponsored: boolean
    },
    createdAt: string,
    editing: {
        isAllowed: boolean,
        allowedUntil?: string,
        remainingCount: number,
        /** The current id of this tweet and ids of all previous edits */
        tweetIds: bigint[]
    },
    /** `true` if the tweet is so long that the full text is not displayed normally. `text` will still contain all text */
    isExpandable: boolean,
    isTranslatable: boolean,
    /** `true` if Twitter restricted this tweet due to it being hateful. This also disables all client-side interaction options */
    isVisibilityRestricted: boolean,
    /** `true` if the tweet has an active or pending Birdwatch note */
    hasBirdwatchNote: boolean,
    /** `true` the tweet has a Grok conversation embed */
    hasGrokChatEmbed: boolean,
    /** `true` if this tweet is quoting another tweet */
    hasQuotedTweet: boolean,
    language: string,
    /** `true` if you liked this tweet */
    liked: boolean,
    /** Amount of users that liked the tweet */
    likesCount: number,
    media: TweetMedia[],
    /** The platform the tweet has posted from */
    source: string,
    /** Amount of users that are quote tweeting the tweet */
    quoteTweetsCount: number,
    /** The quoted tweet, if it exists. May be `undefined` even if `has_quoted_tweet` is `true` and `quoted_tweet_id` is a `string`, to avoid too many recursions. Due to issues on Twitter's end, sometimes the tweet is not sent in the response data, so this property may be `undefined` for no reason */
    quotedTweet?: Tweet,
    /** Id of the quoted tweet, if it exists */
    quotedTweetId?: bigint,
    /** Amount of users that replied to the tweet */
    repliesCount: number,
    /** Reply permission controlling who can reply to this tweet */
    replyPermission: ReplyPermission,
    replyingTo?: {
        /** Username of the user this tweet is in reply to */
        username: string,
        /** Id of the tweet this tweet is in reply to */
        tweetId: bigint
    },
    retweeted: boolean,
    /** Amount of users that retweeted the tweet */
    retweetsCount: number,
    /** The full text of the tweet, including user mentions in the beginning of replies. If the tweet is a note tweet, this property will contain the expanded text instead of the 280 character preview */
    text: string,
    /** Amount of views the tweet has. May be `undefined` if the tweet predates view tracking */
    viewsCount?: number
}

export const Tweet: Wrapped<TweetKind, Model<Tweet, null, { legacy?: false } | { legacy: true, author: object, quotedTweet?: object, quotedTweetAuthor?: object }>> = {
    async new(fmt, value, opts) {
        function getText(t: any) {
            return ((t.note_tweet?.note_tweet_results?.result?.text || t.legacy.full_text || '') as string).replace(
                /\bhttps:\/\/t\.co\/[a-zA-Z0-9_-]+/,
                sub => t.legacy.entities.urls?.find((x: any) => x.url === sub)?.expanded_url || sub
            );
        }

        const editControl = value.edit_control?.edit_control_initial ?? value.edit_control;

        if (opts.legacy) {
            const media = await Promise.all(
                (value.extended_entities.media as any[] ?? []).map(media => fmt.next(TweetMedia, media))
            );

            return {
                __typename: 'Tweet',
                id: BigInt(value.id_str),
                author: await fmt.next(User, opts.author, { legacy: true }),
                bookmarked: !!value.bookmarked,
                bookmarksCount: value.bookmark_count || 0,
                createdAt: new Date(value.created_at).toISOString(),
                contentDisclosures: {
                    isAiGenerated: false,
                    isSponsored: false
                },
                editing: {
                    isAllowed: false,
                    remainingCount: 0,
                    tweetIds: [BigInt(value.id_str)]
                },
                isExpandable: false,
                isTranslatable: !!value.translatable,
                isVisibilityRestricted: false,
                hasBirdwatchNote: !!value.has_birdwatch_notes,
                hasGrokChatEmbed: false,
                hasQuotedTweet: !!value.is_quote_status,
                language: value.lang,
                liked: !!value.favorited,
                likesCount: value.favorite_count || 0,
                media,
                source: value.source,
                quoteTweetsCount: value.quote_count || 0,
                quotedTweet: opts.quotedTweet && opts.quotedTweetAuthor
                    ? await fmt.next(Tweet, opts.quotedTweet, { legacy: true, author: opts.quotedTweetAuthor })
                    : undefined,
                quotedTweetId: value.quoted_status_id_str || undefined,
                repliesCount: value.reply_count || 0,
                replyPermission: match(value.conversation_control?.policy as string | undefined, [
                    ['Community', ReplyPermission.Following],
                    ['Verified', ReplyPermission.Verified],
                    ['ByInvitation', ReplyPermission.Mentioned]
                ], ReplyPermission.Everyone),
                replyingTo: !!value.in_reply_to_status_id_str ? {
                    tweetId: BigInt(value.in_reply_to_status_id_str),
                    username: value.in_reply_to_screen_name
                } : undefined,
                retweeted: !!value.retweeted,
                retweetsCount: value.retweet_count || 0,
                text: value.full_text
            };
        }

        const media = await Promise.all(
            (value.legacy.entities.media as any[] ?? []).map(media => fmt.next(TweetMedia, media))
        );

        return {
            __typename: 'Tweet',
            id: BigInt(value.rest_id),
            author: await fmt.next(User, value.core.user_results.result),
            birdwatchNote: value.birdwatch_pivot?.note?.rest_id ? {
                id: BigInt(value.birdwatch_pivot.note.rest_id),
                // TODO: follow t.co redirects to get actual urls
                text: (value.birdwatch_pivot.subtitle.entities as { fromIndex: number, toIndex: number, ref: { url: string } }[])
                    .toSorted((a, b) => b.fromIndex - a.fromIndex)
                    .reduce((acc, e) => acc.slice(0, e.fromIndex) + e.ref.url + acc.slice(e.toIndex), value.birdwatch_pivot.subtitle.text),
                language: value.birdwatch_pivot.note.language || 'en',
                isTranslatable: !!value.birdwatch_pivot.note.is_community_note_translatable,
                isPublic: value.birdwatch_pivot.visualStyle === 'Default' || value.birdwatch_pivot.title.includes('added context')
            } : undefined,
            bookmarked: !!value.legacy.bookmarked,
            bookmarksCount: value.legacy.bookmark_count || 0,
            card: await fmt.nextIf(CardKind, value.card?.legacy),
            community: await fmt.nextIf(CommunityKind, value.author_community_relationship?.community_results?.result),
            createdAt: new Date(value.legacy.created_at).toISOString(),
            contentDisclosures: {
                isAiGenerated: !!value.content_disclosure?.ai_generated_disclosure?.has_ai_generated_media,
                isSponsored: !!value.content_disclosure?.advertising_disclosure?.is_paid_promotion
            },
            editing: {
                isAllowed: !!editControl?.is_edit_eligible,
                allowedUntil: new Date(Number(editControl?.editable_until_msecs || 0)).toISOString(),
                remainingCount: Number(editControl?.edits_remaining || 0),
                tweetIds: editControl?.edit_tweet_ids?.map(BigInt) ?? [value.rest_id]
            },
            isExpandable: !!value.note_tweet?.is_expandable,
            isTranslatable: !!value.is_translatable,
            isVisibilityRestricted: value.tweetInterstitial?.__typename === 'ContextualTweetInterstitial',
            hasBirdwatchNote: !!value.has_birdwatch_notes,
            hasGrokChatEmbed: !!value.grok_share_attachment,
            hasQuotedTweet: !!value.legacy.is_quote_status,
            language: value.legacy.lang,
            liked: !!value.legacy.favorited,
            likesCount: value.legacy.favorite_count || 0,
            media,
            source: value.source.match(/>(.*?)</)?.at(1) || value.source,
            quoteTweetsCount: value.legacy.quote_count || 0,
            quotedTweet: value.quoted_status_result?.result
                ? await fmt.next(Tweet, value.quoted_status_result?.result)
                : undefined,
            quotedTweetId: value.legacy.quoted_status_id_str
                ? BigInt(value.legacy.quoted_status_id_str)
                : undefined,
            repliesCount: value.legacy.reply_count || 0,
            replyPermission: match(value.legacy.conversation_control?.policy as string | undefined, [
                ['Community', ReplyPermission.Following],
                ['Verified', ReplyPermission.Verified],
                ['ByInvitation', ReplyPermission.Mentioned]
            ], ReplyPermission.Everyone),
            replyingTo: value.legacy.in_reply_to_status_id_str ? {
                tweetId: BigInt(value.legacy.in_reply_to_status_id_str),
                username: value.legacy.in_reply_to_screen_name
            } : undefined,
            retweeted: !!value.legacy.retweeted,
            retweetsCount: value.legacy.retweet_count || 0,
            text: !!value.legacy.entities.media?.length
                ? getText(value).replace(/https:\/\/t\.co\/.+$/, '').trimEnd()
                : getText(value),
            viewsCount: Number(value.views.count) || undefined
        };
    },
    assert(value) {
        return assert(value, 'Tweet');
    }
};

/**
 * Retweet that contains the retweeted tweet within
 */
export interface Retweet extends Type<'Retweet'> {
    id: bigint,
    tweet: Tweet,
    user: User
}
export const Retweet: Wrapped<TweetKind, Model<Retweet>> = {
    async new(fmt, value) {
        return {
            __typename: 'Retweet',
            id: BigInt(value.rest_id),
            tweet: await fmt.next(Tweet, value.legacy.retweeted_status_result.result),
            user: await fmt.next(User, value.core.user_results.result)
        };
    },
    assert(value) {
        return assert(value, 'Retweet');
    }
};

/**
 * Conversation that can contain multiple tweets
 */
export interface Conversation extends Type<'Conversation'> {
    allTweetIds: bigint[],
    items: (MaybeTweet | Cursor)[]
}
export const Conversation: Wrapped<TweetKind, Model<Conversation>> & Default<Conversation> = {
    async new(fmt, value) {
        return {
            __typename: 'Conversation',
            allTweetIds: (value.metadata?.conversationMetadata?.allTweetIds as string[] || []).map(BigInt),
            items: await Promise.all(
                (value.items as any[] || []).map(async item => {
                    const v = item.item.itemContent;

                    return v.__typename === 'TimelineTimelineCursor'
                        ? await fmt.next(Cursor, v)
                        : await fmt.next(MaybeTweet, v, { safe: false });
                })
            )
        };
    },
    assert(value) {
        return assert(value, 'Conversation');
    },
    default() {
        return {
            __typename: 'Conversation',
            allTweetIds: [],
            items: []
        };
    }
};

/**
 * A deleted or unavailable tweet that is represented with a tombstone in-app
 */
export interface TweetTombstone extends Type<'TweetTombstone'> {
    /** Reason for the tweet's unavailability */
    reason: TweetUnavailableReason
}
export const TweetTombstone: Wrapped<TweetKind, Model<TweetTombstone, string | undefined>> & Default<TweetTombstone> = {
    async new(_, value) {
        return {
            __typename: 'TweetTombstone',
            reason: value?.includes('estimates your age')
                ? TweetUnavailableReason.AgeVerificationRequired
            : value?.includes('limits who can view their')
                ? TweetUnavailableReason.AuthorProtected
            : value?.includes('suspended')
                ? TweetUnavailableReason.AuthorSuspended
            : value?.includes('no longer exists')
                ? TweetUnavailableReason.AuthorUnavailable
            : value?.includes('violated')
                ? TweetUnavailableReason.ViolatedRules
            : value?.includes('withheld')
                ? TweetUnavailableReason.Withheld
            : value?.includes('deleted')
                ? TweetUnavailableReason.Deleted
                : TweetUnavailableReason.Unavailable
        };
    },
    assert(value) {
        return assert(value, 'TweetTombstone');
    },
    default() {
        return {
            __typename: 'TweetTombstone',
            reason: TweetUnavailableReason.Unavailable
        };
    }
};

export type MaybeTweet = Tweet | TweetTombstone;
export const MaybeTweet: Wrapped<TweetKind, Model<MaybeTweet, MaybeType, { safe?: boolean }>> & Default<MaybeTweet> = {
    async new(fmt, value, opts) {
        const tweet = await fmt.next(TweetKind, value);

        if (opts.safe && tweet.__typename !== 'Tweet' && tweet.__typename !== 'TweetTombstone') {
            return TweetTombstone.default();
        }

        return this.assert(tweet);
    },
    assert(value) {
        return assert(value, ['Tweet', 'TweetTombstone']);
    },
    default() {
        return TweetTombstone.default();
    }
};

// const x = {} as TweetKind;

// if (MaybeTweet.is(x)) {
// }

export type TweetKind = MaybeTweet | Retweet | Conversation;
export const TweetKind: Model<TweetKind, MaybeType> & Default<TweetKind> = {
    async new(fmt, value) {
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

        const tweet = value.__typename === 'TweetWithVisibilityResults' ? value.tweet : value;

        if (tweet.legacy.retweeted_status_result?.result) {
            return await fmt.next(Retweet, tweet.legacy.retweeted_status_result.result);
        }

        if (tweet.__typename === 'TweetUnavailable' || tweet.__typename === 'TweetTombstone') {
            return await fmt.next(TweetTombstone, tweet.tombstone?.text?.text?.toLowerCase());
        }

        return await fmt.next(Tweet, tweet);
    },
    default() {
        return TweetTombstone.default();
    }
};



export interface DraftTweet extends Type<'DraftTweet'> {
    id: bigint,
    attachmentUrl?: string,
    text: string,
    mediaIds: bigint[],
    thread: {
        text: string,
        mediaIds: bigint[]
    }[]
}
export const DraftTweet: Model<DraftTweet> = {
    async new(_, value) {
        return {
            __typename: 'DraftTweet',
            id: BigInt(value.rest_id),
            attachmentUrl: value.attachment_url,
            text: value.tweet_create_request?.status,
            mediaIds: (value.tweet_create_request?.media_ids as any[] || []).map(BigInt),
            thread: (value.tweet_create_request?.thread_tweets as any[] || []).map(tweet => ({
                text: tweet.status,
                mediaIds: (tweet.mediaIds as any[] || []).map(BigInt)
            }))
        };
    }
};

export interface ScheduledTweet extends Omit<DraftTweet, '__typename'>, Type<'ScheduledTweet'> {
    sendAt: string
}
export const ScheduledTweet: Model<ScheduledTweet> = {
    async new(fmt, value) {
        const draftTweet = await fmt.next(DraftTweet, value);

        return {
            ...draftTweet,
            __typename: 'ScheduledTweet',
            sendAt: new Date(value.scheduling_info).toISOString()
        };
    }
};



/**
 * Tweet unavailability reasons
 * 
 * @enum
 */
export const TweetUnavailableReason = {
    /** ID verification is required to view this tweet. Restricted server-side */
    AgeVerificationRequired: 'AgeVerificationRequired',
    /** Author has protected their tweets */
    AuthorProtected: 'AuthorProtected',
    /** Author has been suspended */
    AuthorSuspended: 'AuthorSuspended',
    /** Author has deactivated or is otherwise unavailable */
    AuthorUnavailable: 'AuthorUnavailable',
    /** Tweet has been deleted */
    Deleted: 'Deleted',
    /** Tweet has been removed because it violated Twitter's rules */
    ViolatedRules: 'ViolatedRules',
    /** Tweet has been withheld in your country or all countries */
    Withheld: 'Withheld',
    /** @default */
    Unavailable: 'Unavailable'
} as const;
export type TweetUnavailableReason = Enum<typeof TweetUnavailableReason>;

/**
 * Tweet conversation control options
 * 
 * @enum
 */
export const ReplyPermission = {
    /**
     * Everyone can reply
     * 
     * @default
     */
    Everyone: 'Everyone',
    /** Only people you follow can reply */
    Following: 'Following',
    /** Only people you mentioned can reply */
    Mentioned: 'Mentioned',
    /** Only verified users can reply (not recommended) */
    Verified: 'Verified'
} as const;
export type ReplyPermission = Enum<typeof ReplyPermission>;
