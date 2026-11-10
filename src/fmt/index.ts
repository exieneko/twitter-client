import { FormatterError, TwitterError } from './errors.js';
import type { TwitterClient } from '../client.js';
import type { ENDPOINTS } from '../consts.js';
import * as T from '../types/index.js';
import type { AsyncConstructor, MaybeType, PartialBy, Type } from '../types/utils.js';
import { match } from '../utils/index.js';
import type { Logger } from '../utils/log.js';

export class TwitterFormatter {
    params: Map<string, any>;
    client: TwitterClient & { log?: Logger };
    depth = 0;
    errors: TwitterError[];

    constructor(client: TwitterClient, params?: object) {
        this.client = client as typeof this.client;
        this.params = new Map(Object.entries(params ?? {}));
        this.errors = [];
    }



    private handleError<T>(cause: unknown): T {
        const error = new FormatterError('Error thrown during formatting', { cause });
        this.errors.push(error);

        const index = this.errors.length - 1;

        this.client.log?.error(error, `@${index}`);
        this.client.log?.trace(error.message);

        return { __typename: 'Error', index } as T;
    }

    async format<T>(fn: (fmt: this, value: any) => T | Promise<T>, value: any): Promise<T | undefined> {
        let result: T;
        this.depth++;

        try {
            result = await fn(this, value);

            if (typeof result === 'boolean') {
                result &&= { ok: result } as T;
            } else if (typeof result !== 'object') {
                result &&= { value: result } as T;
            }
        } catch (error) {
            return this.handleError(error);
        } finally {
            this.depth--;
        }

        this.client.log?.debug('Parsed JSON content length:', JSON.stringify(value).length, '->', JSON.stringify(result).length);
        return result;
    }

    async next<F extends AsyncConstructor<This, any, NonNullable<O>>, This = Awaited<ReturnType<F>>, O extends Record<string, any> | undefined = Parameters<F>[2]>(fn: F, value: Parameters<F>[1], ...rest: [O] extends [null | undefined] ? [] : Required<O> extends O ? [opts?: O] : [opts: O]): Promise<Awaited<This>> {
        this.depth++;
        const opts = rest[0] ?? {};

        try {
            // @ts-ignore
            return await fn(this, value, opts);
        } catch (error) {
            return await this.handleError(error);
        } finally {
            this.depth--;
        }
    }

    entries(instructions: { type?: string, entries?: any[] }[]): any[] {
        const pin = instructions.find(instruction => instruction.type === 'TimelinePinEntry') as { type: 'TimelinePinEntry', entry: any } | undefined;
        const entries = instructions.find(instruction => instruction.type === 'TimelineAddEntries')?.entries || [];

        if (pin) {
            return [pin.entry, ...entries];
        }

        return entries;
    }
}



type TweetLegacyOpts = {
    legacy?: false
} | {
    legacy: true,
    globalObjects: {
        tweets: Record<string, Record<string, any>>,
        users: Record<string, Record<string, any>>
    }
};

type BVGetter = (bindingValues: {
    key: string,
    value: {
        boolean_value?: boolean,
        string_value?: string,
        image_value?: T.CardImage
    }
}[], key: string) => Parameters<BVGetter>[0][number]['value'] | undefined;

interface CardOpts {
    bv: any,
    get: BVGetter
}



// account.ts
export const accountSettings: AsyncConstructor<T.AccountSettings> = async (_, value) => {
    return {
        __typename: 'AccountSettings',
        autoplay: !value.autoplay_disabled,
        country: value.country_code || 'us',
        displaySensitiveMedia: !!value.display_sensitive_media,
        dmAllowedFrom: match(value.allow_dms_from, [
            ['following', T.InboxPrivacy.Following],
            ['verified', T.InboxPrivacy.Verified],
        ], T.InboxPrivacy.Everyone),
        dmGroupsAllowedFrom: match(value.allow_dm_groups_from, [
            ['following', T.InboxPrivacy.Following],
            ['verified', T.InboxPrivacy.Verified],
        ], T.InboxPrivacy.Everyone),
        dmReceipts: value.dm_receipt_setting !== 'all_disabled',
        dmQualityFilter: value.dm_quality_filter !== 'disabled',
        isEu: value.settings_medadata?.is_eu === 'true',
        isEmailPublic: !!value.discoverable_by_email_address,
        isNsfw: !!value.nfsw_user || !!value.nsfw_admin,
        isPhoneNumberPublic: !!value.discoverable_by_mobile_phone,
        language: value.language,
        protected: !!value.protected,
        privacy: {
            allowPersonalizedAds: !!value.allow_ads_personalization,
            allowCookies: !!value.use_cookie_personalization,
            allowSellingYourInformation: !!value.allow_sharing_data_for_third_party_personalization,
            allowLocationHistory: !!value.allow_location_history_personalization,
            personalizedTrends: !!value.personalized_trends,
            showCurrentAudiospacePublicly: !!value.ext_sharing_audiospaces_listening_data_with_followers
        },
        username: value.screen_name
    };
};

export const accountSession: AsyncConstructor<T.AccountSession> = async (_, value) => {
    return {
        name: value.name,
        description: !!value.summary ? value.summary : undefined,
        isCurrentSession: !!value.is_current_session,
        lastSeenAt: new Date(Number(value.last_seen_time_ms) || 0).toISOString(),
        location: value.location,
        token: value.token
    };
};

export const dataSaverSettings: AsyncConstructor<T.DataSaverSettings> = async (_, value) => {
    return {
        dataSaverMode: value.dataSaverMode,
        videoAutoplay: value.videoAutoplay
    }
};



// birdwatch.ts
export const birdwatchNote: AsyncConstructor<T.BirdwatchNote> = async (fmt, value) => {
    return {
        __typename: 'BirdwatchNote',
        id: value.rest_id,
        author: await fmt.next(birdwatchUser, value.birdwatch_profile, { isAi: !!value.is_api_author }),
        byMedia: !!value.is_media_note,
        byUrl: !!value.is_url_note,
        createdAt: new Date(value.created_at).toISOString(),
        hasTrustworthySources: !!value.data_v1.trustworthy_sources,
        lang: value.language || 'en',
        mediaMatchesCount: value.media_note_matches_v2?.match_count || Number(value.media_note_matches || 0),
        status: match(value.rating_status, [
            ['CurrentlyRatedHelpful', T.BirdwatchNoteStatus.RatedHelpful],
            ['CurrentlyRatedNotHelpful', T.BirdwatchNoteStatus.RatedUnhelpful]
        ], T.BirdwatchNoteStatus.Unrated),
        tags: {
            ...(value.classification !== 'NotMisleading' ? {
                __typename: 'MisleadingTweet',
                tweetMisleadingTags: value.data_v1.misleading_tags || []
            } : {
                __typename: 'NoNoteNeeded',
                tweetNotMisleadingTags: value.data_v1.not_misleading_tags || []
            }),
            noteHelpfulTags: value.helpful_tags || [],
            noteUnhelpfulTags: value.not_helpful_tags || []
        },
        text: value.data_v1.summary?.text || '',
        tweetId: value.tweet_results.result.rest_id
    };
};

export const tweetBirdwatchNotes: AsyncConstructor<T.TweetBirdwatchNotes> = async (fmt, value) => {
    return {
        canWriteNote: !!value.can_user_write_notes_on_post_author,
        pendingNotes: await Promise.all((value.misleading_birdwatch_notes?.notes as any[] || []).map(note => fmt.next(birdwatchNote, note))),
        notNeededNotes: await Promise.all((value.not_misleading_birdwatch_notes?.notes as any[] || []).map(note => fmt.next(birdwatchNote, note)))
    };
};

export const birdwatchUser: AsyncConstructor<T.BirdwatchUser, Record<string, any>, { isAi?: boolean }> = async (_, value, opts) => {
    return {
        __typename: 'BirdwatchUser',
        alias: value.alias,
        isAi: !!value.is_api_contributor || !!opts.isAi,
        ratings: {
            successful: {
                helpfulCount: value.ratings_count?.successful?.helpful_count || 0,
                unhelpfulCount: value.ratings_count?.successful?.not_helpful_count || 0
            },
            unsuccessful: {
                helpfulCount: value.ratings_count?.unsuccessful?.helpful_count || 0,
                unhelpfulCount: value.ratings_count?.unsuccessful?.not_helpful_count || 0
            },
            pendingCount: value.ratings_count?.awaiting_more_ratings || 0,
            updatedAt: new Date(value.ratings_count?.last_updated_at).toISOString()
        },
        notes: {
            helpfulCount: value.notes_count?.currently_rated_helpful || 0,
            unhelpfulCount: value.notes_count?.currently_rated_not_helpful || 0,
            pendingCount: value.notes_count?.awaiting_more_ratings || 0,
            updatedAt: new Date(value.notes_count?.last_updated_at).toISOString()
        }
    };
};

export const birdwatchBatSignal: AsyncConstructor<T.BirdwatchBatSignal> = async (_, value) => {
    return {
        createdAt: 'created_at' in value ? new Date(value.created_at).toISOString() : undefined,
        hasLiveNote: !!value.has_live_note,
        sourceLink: value.source_link
    };
};



// card.ts
export const embedCard: AsyncConstructor<T.Embed, Record<string, any>, CardOpts> = async (_, value, { bv, get }) => {
    return {
        __typename: 'Embed',
        cardName: value.name,
        cardUrl: value.url,
        description: get(bv, 'description')?.string_value || '',
        domain: get(bv, 'domain')?.string_value!,
        thumbnail: get(bv, 'thumbnail_image_original')?.image_value,
        title: get(bv, 'title')?.string_value!
    };
};

export const pollCard: AsyncConstructor<T.Poll, Record<string, any>, CardOpts> = async (fmt, value, { bv, get }) => {
    const choiceCount = Number(get(bv, 'choice_count')?.string_value || 0);

    const choices = await Promise.all(
        [...Array(choiceCount).keys()].map(i => fmt.next(async (_, index, { bv, get }) => {
            const i = index + 1;
    
            return {
                text: get(bv, `choice${i}_label`)?.string_value || '',
                image: get(bv, `choice${i}_image`)?.image_value,
                votesCount: Number(get(bv, `choice${i}_count`)?.string_value || 0)
            };
        }, i, { bv, get }))
    );

    return {
        __typename: 'Poll',
        cardName: value.name,
        cardUrl: value.url,
        choices,
        duration: Number(get(bv, 'duration_minutes')?.string_value || 0) * 60 * 1000,
        endsAt: new Date(get(bv, 'end_datetime_utc')?.string_value || 0).toISOString(),
        totalVotesCount: choices.reduce((acc, current) => acc + current.votesCount, 0)
    };
};

export const broadcastCard: AsyncConstructor<T.BroadcastCard, Record<string, any>, CardOpts> = async (fmt, value, { bv, get }) => {
    return {
        __typename: 'Broadcast',
        id: get(bv, 'broadcast_id')?.string_value!,
        author: await fmt.next(user, value.user_refs_results?.at(0)?.result),
        cardName: value.name,
        cardUrl: value.url,
        hasEnded: get(bv, 'broadcast_state')?.string_value?.toUpperCase() === 'ENDED',
        mediaId: get(bv, 'broadcast_media_id')?.string_value!,
        mediaKey: get(bv, 'broadcast_media_key')?.string_value!,
        thumbnail: get(bv, 'broadcast_thumbnail_original')?.image_value,
        title: get(bv, 'title')?.string_value!,
        width: Number(get(bv, 'broadcast_width')?.string_value || 0),
        height: Number(get(bv, 'broadcast_height')?.string_value || 0)
    };
};

export const audiospaceCard: AsyncConstructor<T.Audiospace, Record<string, any>, CardOpts & { tweet: Record<string, any> }> = async (fmt, value, { tweet }) => {
    return {
        __typename: 'Audiospace',
        author: await fmt.next(user, value.user_refs_results?.at(0)?.result, { legacy: true }),
        audiowaves: tweet.voiceInfo.audiowaveValues ?? [],
        cardName: value.name,
        cardUrl: value.url,
        duration: tweet.voiceInfo.totalDurationMillis || 0
    };
};

export const cardResult: AsyncConstructor<T.CardResult, Record<string, any>, { tweet: Record<string, any> }> = async (fmt, value, { tweet }) => {
    const get: BVGetter = (bindingValues: { key: string, value: { boolean_value?: boolean, string_value?: string, image_value?: T.CardImage } }[], key: string) => {
        return bindingValues.find(v => v.key === key)?.value;
    };

    const bv = value.binding_values;
    const opts: CardOpts = { bv, get };

    if (value.name.includes(':audiospace') || 'voiceInfo' in tweet) {
        return await fmt.next(audiospaceCard, value, { ...opts, tweet });
    } else if (value.name.includes(':broadcast')) {
        return await fmt.next(broadcastCard, value, opts);
    } else if (value.name.includes(':poll')) {
        return await fmt.next(pollCard, value, opts);
    }

    // :summary
    return await fmt.next(embedCard, value, opts);
};



// community.ts
export const community: AsyncConstructor<T.Community> = async (fmt, value) => {
    const creatorName = value.creator_results.result.core.screen_name;
    const { data: creator } = await fmt.client.getUser(creatorName, { byUsername: true });

    return {
        __typename: 'Community',
        id: value.id_str,
        bannerUrl: value.custom_banner_media?.media_info?.original_img_url,
        canJoin: value.join_policy === 'Open',
        canInvite: value.invites_policy === 'MemberInvitesAllowed' && !value.invites_result?.__typename.includes('Unavailable'),
        createdAt: new Date(value.created_at).toISOString(),
        creator: creator!,
        description: value.description || '',
        isMember: !!value.is_member,
        membersCount: value.member_count || 0,
        moderatorsCount: value.moderator_count || 0,
        name: value.name,
        isNsfw: !!value.is_nsfw,
        isPinned: !!value.is_pinned,
        role: match(value.role as string, [
            ['NonMember', T.CommunityRole.Guest],
            ['Member', T.CommunityRole.Member],
            ['Moderator', T.CommunityRole.Moderator]
        ], T.CommunityRole.Owner),
        rules: (value.rules as any[] || []).map(rule => ({
            id: rule.rest_id,
            description: rule.description,
            name: rule.name
        })),
        topic: value.primary_community_topic?.topic_name
    };
};

export const unavailableCommunity: AsyncConstructor<T.UnavailableCommunity, null> = async () => ({ __typename: 'UnavailableCommunity' });

export const communityResult: AsyncConstructor<T.CommunityResult, MaybeType> = async (fmt, value) => {
    if (!value || value.__typename === 'CommunityUnavailable') {
        return fmt.next(unavailableCommunity, null);
    }

    return fmt.next(community, value);
};



// discover.ts
export const trend: AsyncConstructor<T.Trend> = async (_, value) => {
    return {
        __typename: 'Trend',
        context: value.trend_metadata?.domain_context,
        groupedTrends: (value.grouped_trends as any[] || [])?.map(trend => trend.name),
        name: value.name,
        // TODO
        tweetsCount: undefined
    };
};



// list.ts
export const list: AsyncConstructor<T.List> = async (fmt, value) => {
    return {
        __typename: 'List',
        id: value.id_str,
        bannerUrl: value.custom_banner_media.media_info.original_img_id,
        createdAt: new Date(value.created_at).toISOString(),
        creator: await fmt.next(user, value.user_results?.result),
        description: value.description || '',
        isListed: !!value.is_member,
        listedCount: value.member_count || 0,
        muted: !!value.muting,
        name: value.name,
        isPinned: !!value.pinning,
        isPublic: value.mode === 'Public',
        isSubscribed: !!value.following,
        subscribersCount: value.subscriber_count || 0
    };
};

export const unavailableList: AsyncConstructor<T.UnavailableList, null> = async () => ({ __typename: 'UnavailableList' });

export const listResult: AsyncConstructor<T.ListResult> = async (fmt, value) => {
    if (!value || !('created_at' in value)) {
        return fmt.next(unavailableList, null);
    }

    return fmt.next(list, value);
};


// media.ts
export const tweetImage: AsyncConstructor<T.TweetImage> = async (_, value) => {
    return {
        __typename: 'TweetImage',
        id: value.id_str,
        altText: value.ext_alt_text || undefined,
        availability: match(value.ext_media_availability?.reason, [
            [undefined, T.TweetMediaAvailability.Available],
            ['DMCAed', T.TweetMediaAvailability.Copyright],
            ['Geoblocked', T.TweetMediaAvailability.GeoBlocked]
        ], T.TweetMediaAvailability.Other),
        contentWarnings: {
            nsfw: !!value.sensitive_media_warning?.adult_content,
            violence: !!value.sensitive_media_warning?.graphic_violence,
            sensitive: !!value.sensitive_media_warning?.other
        },
        isAiGenerated: !!value.media_results?.result?.grok_image_annotation,
        size: [value.original_info.width ?? 0, value.original_info.height ?? 0],
        url: value.media_url_https
    };
};

export const tweetVideo: AsyncConstructor<T.TweetVideo> = async (fmt, value) => {
    let image = await fmt.next(tweetImage, value);
    delete image.altText;

    return {
        ...image,
        __typename: 'TweetVideo',
        aspectRatio: value.video_info?.aspect_ratio ?? [1, 1],
        duration: value.video_info?.duration_millis || 0,
        thumbnailUrl: value.media_url_https,
        variants: value.video_info.variants.map((variant: any) => ({
            bitrate: variant.bitrate,
            contentType: variant.content_type,
            url: variant.url
        }) satisfies T.TweetVideo['variants'][number]),
        url: value.video_info.variants.at(-1).url
    };
};

export const tweetGif: AsyncConstructor<T.TweetGif> = async (fmt, value) => {
    let video: PartialBy<T.TweetVideo, 'duration'> = await fmt.next(tweetVideo, value);
    delete video.duration;

    return {
        ...video,
        __typename: 'TweetGif'
    };
};

export const tweetMedia: AsyncConstructor<T.TweetMedia> = async (fmt, value) => {
    return await fmt.next(
        match<string, AsyncConstructor<T.TweetMedia>>(value.type, [
            ['video', tweetVideo],
            [['gif', 'animated_gif'], tweetGif]
        ], tweetImage),
        value
    );
};

export const tweetMediaData: AsyncConstructor<T.TweetMediaData> = async (_, value) => {
    return {
        __typename: 'TweetMediaData',
        id: value.media_id_string,
        mediaKey: value.media_key,
        bytes: value.size || 0,
        contentType: value.image?.image_type || value.video?.video_type || 'image/gif',
        expiresIn: value.expires_after_secs || 0,
        size: value.image && value.image?.w && value.image?.h ? [value.image?.w || 1, value.image?.h || 1] : undefined,
        processing: value.processing_info ? {
            state: match(value.processing_info.state, [
                ['succeeded', T.TweetMediaState.Success],
                ['failed', T.TweetMediaState.Failure]
            ], T.TweetMediaState.Pending),
            progress: value.processing_info?.progress_percent || 0
        } : undefined
    };
};



// notifications.ts
export const notification: AsyncConstructor<T.Notification, Record<string, any>, { type: string }> = async (fmt, value, opts) => {
    const type: T.NotificationType = match(opts.type, [
        ['device_follow_tweet_notification_entry', T.NotificationType.NewTweets],
        ['generic_magic_rec_pyle_recommended', T.NotificationType.RecommendedTweets],
        
        ['users_mentioned_you', T.NotificationType.Mentioned],
        ['users_followed_you', T.NotificationType.NewFollowers],
        ['users_liked_your_tweet', T.NotificationType.TweetLiked],
        ['users_retweeted_your_tweet', T.NotificationType.TweetRetweeted],
        ['users_liked_your_retweet', T.NotificationType.RetweetLiked],
        ['users_retweeted_your_tweet', T.NotificationType.RetweetRetweeted],
        ['users_added_you_to_lists', T.NotificationType.AddedToList],
        ['users_subscribed_to_your_list', T.NotificationType.ListSubscribedTo],
        ['generic_poll_voter_summary', T.NotificationType.PollFinished],
        
        ['generic_birdwatch_needs_your_help', T.NotificationType.BirdwatchNoteNeedsHelp],
        ['generic_birdwatch_helpful_valid_rater', T.NotificationType.BirdwatchNoteRatedHelpful],
        ['generic_birdwatch_not_helpful_valid_rater', T.NotificationType.BirdwatchNoteRatedNotHelpful],
        ['generic_birdwatch_delete_post_rater', T.NotificationType.BirdwatchNoteRatedDeleted],
        
        ['generic_login_notification', T.NotificationType.LoggedIn],
        ['generic_report_received', T.NotificationType.ReportReceived],
        ['generic_report_update', T.NotificationType.ReportUpdate],
        ['generic_subscription_promotion_premium', T.NotificationType.Advertisement]
    ], T.NotificationType.Unknown);

    const t = await fmt.next(tweetResult, value.tweet_results?.result).then(tweet => tweet.__typename === 'Tweet' ? tweet : undefined);

    const objectId = match<string, string>(type, [
        [T.NotificationType.Mentioned, t?.id!],
        [[T.NotificationType.TweetLiked, T.NotificationType.TweetRetweeted, T.NotificationType.RetweetLiked, T.NotificationType.RetweetRetweeted], value.template?.target_objects?.at(0)?.result?.rest_id],
        [[T.NotificationType.AddedToList, T.NotificationType.ListSubscribedTo], value.notification_url?.url?.match(/list\/(\d+?)$/)?.at(1)],
        [[T.NotificationType.BirdwatchNoteNeedsHelp, T.NotificationType.BirdwatchNoteRatedHelpful, T.NotificationType.BirdwatchNoteRatedNotHelpful, T.NotificationType.BirdwatchNoteRatedDeleted], value?.rich_message?.text, value.notification_url?.url?.match(/birdwatch\/n\/(\d+?)(\?src|$)/)?.at(1)]
    ]);

    const tweets = await Promise.all(
        (value.template?.target_objects as MaybeType[] || []).filter(x => x?.__typename === 'TimelineNotificationTweetRef').map(x => fmt.next(tweetResult, x?.result))
    );
    const users = await Promise.all(
        (value.template?.from_users as MaybeType[] || []).filter(x => typeof x === 'object' && 'user_results' in x).map(x => fmt.next(user, x!.user_results?.result))
    );

    return {
        __typename: 'Notification',
        id: value.id || t?.id,
        createdAt: new Date(value.timestamp_ms).toISOString(),
        objectId,
        text: match(type, [
            [T.NotificationType.AddedToList, T.NotificationType.ListSubscribedTo, value.rich_message?.text?.match(/List\s(.*?)$/)?.at(1)],
            [[T.NotificationType.BirdwatchNoteNeedsHelp, T.NotificationType.BirdwatchNoteRatedHelpful, T.NotificationType.BirdwatchNoteRatedNotHelpful, T.NotificationType.BirdwatchNoteRatedDeleted], value.template?.additional_context?.text],
            [T.NotificationType.ReportUpdate, value?.rich_message?.text]
        ]),
        type,
        tweets: tweets.filter(tweet => tweet?.__typename === 'Tweet'),
        users: users.filter(user => user?.__typename === 'User')
    };
};

export const unreadCount: AsyncConstructor<T.UnreadCount> = async (_, value) => {
    return {
        __typename: 'UnreadCount',
        notifications: value.ntab_unread_count || 0,
        inbox: value.dm_unread_count || value.xchat_unread_count || 0
    };
};



// search.ts
export const typeahead: AsyncConstructor<T.Typeahead> = async (_, value) => {
    return {
        resultsCount: value.num_results,
        topics: (value.topics as any[] || []).map(topic => topic.topic),
        userIds: (value.users as any[] || []).map(user => user.id_str),
        query: value.query
    };
};



// timeline.ts
export const cursor: AsyncConstructor<T.Cursor> = async (_, value) => {
    return {
        __typename: 'Cursor',
        direction: match(value.cursorType as string, [
            ['Top', T.CursorDirection.Previous],
            ['ShowMore', T.CursorDirection.ShowMore],
            ['ShowMoreThreads', T.CursorDirection.ShowSpam],
        ], T.CursorDirection.Next),
        value: value.value
    };
};

export const slice: AsyncConstructor<T.Slice<any>, T.Entry<Type>[], { body?: Record<string, any> }> = async (_, value, opts) => {
    const cursors = value.filter(entry => entry.content.__typename === 'Cursor') as T.Entry<T.Cursor>[];

    return {
        entries: value,
        cursors: {
            previous: cursors.find(entry => entry.content.direction === T.CursorDirection.Previous)?.content.value,
            next: cursors.findLast(entry => entry.content.direction === T.CursorDirection.Next)?.content.value
        },
        name: opts.body?.initialTimeline.id,
        segments: (opts.body?.timelines as any[] | undefined)?.map(timeline => ({
            id: timeline.timeline.id,
            name: timeline.id
        } satisfies T.TimelineSegment))
    };
};

export namespace Entries {
    type SliceConstructor<This extends Type, O extends Record<string, any> | null = null> = AsyncConstructor<T.Slice<This>, any[], O>;

    export const discover: SliceConstructor<T.TweetResult | T.Trend, { root: Record<string, any> }> = async (fmt, value, opts) => {
        const entries: T.Entry<T.Tweet | T.Trend | T.Cursor>[] = await Promise.all(
            fmt
                .entries(value)
                .filter(entry => /^(?:trend|tweet|cursor)-/.test(entry.entryId))
                .map(async entry => ({
                    id: entry.entryId as string,
                    content: entry.entryId.startsWith('trend-')
                        ? await fmt.next(trend, entry.content.itemContent)
                    : entry.entryId.startsWith('tweet-')
                        ? await fmt.next(tweet, entry.content.itemContent)
                        : await fmt.next(cursor, entry.content)
                }))
        );

        return fmt.next(slice, entries, { body: opts.root });
    };

    export const lists: SliceConstructor<T.ListResult, { type: 'Default' | 'Discovery' }> = async (fmt, value, opts) => {
        let entries: T.Entry<T.ListResult | T.Cursor>[];

        if (opts.type === 'Discovery') {
            entries = await Promise.all((fmt.entries(value).find(entry => entry.entryId.includes('discovery'))?.content?.items as any[] || []).map(async entry => ({
                id: entry.entryId,
                content: await fmt.next(listResult, entry.item.itemContent.list)
            })));
        } else {
            entries = await Promise.all(fmt.entries(value).map(async entry => ({
                id: entry.entryId,
                content: entry.content?.__typename === 'TimelineTimelineCursor'
                    ? await fmt.next(cursor, entry.content)
                    : await fmt.next(listResult, entry.content.itemContent.list)
            })));
        }

        return fmt.next(slice, entries);
    };

    export const notifications: SliceConstructor<T.Notification> = async (fmt, value) => {
        const entries = await Promise.all(
            fmt.entries(value).map(async entry => ({
                id: entry.entryId,
                content: entry.content?.__typename === 'TimelineTimelineCursor'
                    ? await fmt.next(cursor, entry.content)
                    : await fmt.next(notification, entry.content.itemContent, { type: entry.content.clientEventInfo.element })
            }))
        );

        return await fmt.next(slice, entries);
    };

    export const search: SliceConstructor<T.TweetResult | T.UserResult | T.ListResult> = async (fmt, value) => {
        const product: typeof ENDPOINTS.SearchTimeline._params.product = fmt.params.get('product');

        if (product === 'People') {
            return Entries.users(fmt, value);
        } else if (product !== 'Lists') {
            return Entries.tweets(fmt, value, { type: 'Default' });
        }

        const entries = [
            ...fmt
                .entries(value)
                .filter(entry => entry?.content?.__typename === 'TimelineTimelineCursor')
                .map(async entry => ({
                    id: entry.entryId,
                    content: await fmt.next(cursor, entry.cursor)
                })),
            ...fmt
                .entries(value)
                .find(entry => entry.entryId === 'list-search-0')
                ?.content
                ?.items
                ?.filter((entry: any) => /^list-search-\d-list-\d+/.test(entry.entryId))
                .map(async (entry: any) => ({
                    id: entry.entryId,
                    content: await fmt.next(listResult, entry.content.itemContent.list)
                }))
        ];

        return await fmt.next(slice, await Promise.all(entries));
    };

    export const trends: SliceConstructor<T.Trend> = async (fmt, value) => {
        const entries = await Promise.all(
            (fmt.entries(value).at(0)?.content?.items as any[] || [])?.map(async (item, i) => ({
                id: `trend_${i}`,
                content: await fmt.next(trend, item.item.itemContent)
            }))
        );

        return await fmt.next(slice, entries, {});
    };

    export const tweets: SliceConstructor<T.TweetResult, { type: 'Default' } | { type: 'Birdwatch', root: Record<string, any> } | { type: 'Media', gridModule?: { content: object, key: string } } | { type: 'DeviceFollow', globalObjects: Record<string, any> }> = async (fmt, value, opts) => {
        let entries: T.Entry<T.TweetResult | T.Cursor>[];

        switch (opts.type) {
            case 'Media':
                const grid = opts.gridModule?.content ?? fmt.entries(value).find(entry => entry.content.__typename === 'TimelineTimelineModule')?.content;
                const items: any[] = grid?.[opts.gridModule?.key ?? 'items'] || [];

                entries = await Promise.all([
                    ...fmt
                        .entries(value)
                        .filter(entry => entry.content.__typename === 'TimelineTimelineCursor')
                        .map(async entry => ({
                            id: entry.entryId,
                            content: await fmt.next(cursor, entry.content)
                        })),
                    ...items
                        .map(async item => ({
                            id: item.entryId,
                            content: item.item.itemContent.__typename === 'TimelineTimelineCursor'
                                ? await fmt.next(cursor, item.item.itemContent)
                                : await fmt.next(tweetResult, item.item.itemContent.tweet_results?.result)
                        }))
                ]);
                break;
            case 'DeviceFollow':
                entries = await Promise.all(
                    value
                        .map(async entry => {
                            const id: string = entry.entryId;

                            if ('operation' in entry.content) {
                                return {
                                    id,
                                    content: await fmt.next(cursor, entry.content.operation.cursor)
                                };
                            }

                            const tweetId = entry.content.item.content.tweet.id;
                            const tweet = opts.globalObjects.tweets[tweetId];

                            return {
                                id,
                                content: await fmt.next(tweetResult, tweet, { legacy: true, globalObjects: opts.globalObjects as any })
                            };
                        })
                );
                break;
            default:
                entries = [];
                let conversationMembers = new Set<string>();

                for (const entry of fmt.entries(value)) {
                    const id: string = entry.entryId;

                    if (entry.content.__typename === 'TimelineTimelineCursor') {
                        entries.push({
                            id,
                            content: await fmt.next(cursor, entry.content)
                        });
                        continue;
                    } else if (entry.content.__typename === 'TimelineTimelineItem' && !id.includes('promoted') && id.includes('tweet')) {
                        const content = await fmt.next(tweetResult, entry.content.itemContent.tweet_results?.result);

                        if (content.__typename === 'Tweet' && content.replyingTo?.username && !conversationMembers.has(content.replyingTo.username.toLowerCase())) {
                            conversationMembers.add(content.replyingTo.username.toLowerCase());
                        }

                        entries.push({ id, content });
                        continue;
                    } else if (entry.content.__typename === 'TimelineTimelineModule' && id.includes('conversation')) {
                        if (entry.content.items.at(0)?.entryId.includes('promoted')) {
                            continue;
                        }

                        entries.push({
                            id,
                            content: await fmt.next(conversation, entry.content, { members: conversationMembers })
                        });
                        continue;
                    }
                }
                break;
        }

        return await fmt.next(slice, entries, opts.type === 'Birdwatch' ? { body: opts.root } : {});
    };

    export const users: SliceConstructor<T.UserResult> = async (fmt, value) => {
        const entries = await Promise.all(
            fmt
                .entries(value)
                .map(async entry => ({
                    id: entry.entryId,
                    content: entry.content.__typename === 'TimelineTimelineCursor'
                        ? await fmt.next(cursor, entry.content)
                        : await fmt.next(userResult, entry.content.itemContent?.user_results?.result)
                }))
        );
    
        return await fmt.next(slice, entries, {});
    };

    export const cursors = (value: { entries: any[] }) => {
        const cursors = value.entries.filter((entry): entry is T.Entry<T.Cursor> => entry.content.__typename === 'Cursor');

        return {
            previous: cursors.find(entry => entry.content.direction === T.CursorDirection.Previous)?.content.value,
            next: cursors.findLast(entry => entry.content.direction === T.CursorDirection.Next)?.content.value
        };
    };
}


// tweet.ts
export const tweet: AsyncConstructor<T.Tweet, Record<string, any>, TweetLegacyOpts & { mediaVisibilityResults?: Record<string, any>, softInterventionPivot?: Record<string, any>, tweetInterstitial?: Record<string, any> }> = async (fmt, value, opts) => {
    function getText(t: any, fullText: string, legacy: boolean): string {
        let text = fullText;

        const mediaCount: number = (legacy ? t.extended_entities?.media?.length : t.legacy?.entities?.media?.length) ?? 0;

        if (/^https:\/\/t\.co\.[a-zA-Z0-9_\-]+\/?$/.test(text) && mediaCount > 0) {
            return '';
        }

        text = text
            .replace(/\bhttps:\/\/t\.co\/[a-zA-Z0-9_\-]+/g, sub => ((legacy ? t.entities.urls : t.legacy.entities.urls) as any[] || [])?.find(x => x.url === sub)?.expanded_url || sub)
            .replace(/\bhttps:\/\/t\.co\/[a-zA-Z0-9_\-]+$/g, '')
            .trimEnd();

        const replyingTo: string | undefined = (legacy ? value : value.legacy)?.in_reply_to_screen_name ?? undefined;

        if (!replyingTo) {
            return text;
        }

        return text
            .replace(new RegExp(`^\\@${replyingTo}`, 'i'), '')
            .trimStart();
    }

    function getRestrictionReason(text: string): T.TweetRestrictionReason | undefined {
        if (text === '' || /account you muted/i.test(text)) {
            return;
        }

        if (/public.s interest/i.test(text)) {
            return T.TweetRestrictionReason.ViolatedRulesPublicInterest;
        } else if (/violent speech/i.test(text)) {
            return T.TweetRestrictionReason.ViolentSpeech;
        } else if (/hateful conduct/i.test(text)) {
            return T.TweetRestrictionReason.HatefulConduct;
        } else if (/abuse/i.test(text)) {
            return T.TweetRestrictionReason.Abuse;
        }

        return T.TweetRestrictionReason.Other;
    }

    const editControl = value.edit_control?.edit_control_initial ?? value.edit_control;
    const fullText = value.note_tweet?.note_tweet_results?.result?.text || value.legacy?.full_text || value.full_text || '';
    const source = value.source?.match(/>(.*?)</)?.at(1) || value.source || 'Twitter Web App';
    const text = getText(value, fullText, !!opts.legacy);
    const visibilityRestrictionReason = getRestrictionReason((opts.tweetInterstitial ?? opts.softInterventionPivot)?.text?.text || '');

    if (opts.legacy) {
        const media = await Promise.all(
            (value.extended_entities?.media as any[] ?? []).map(media => fmt.next(tweetMedia, media))
        );

        return {
            __typename: 'Tweet',
            id: value.id_str,
            author: await fmt.next(user, opts.globalObjects.users[value.user_id_str], { legacy: true }),
            isBookmarked: !!value.bookmarked,
            bookmarksCount: value.bookmark_count || 0,
            createdAt: new Date(value.created_at).toISOString(),
            contentDisclosures: {
                isAiGenerated: false,
                isSponsored: false
            },
            isDownvoted: false,
            editing: {
                isAllowed: false,
                remainingCount: 0,
                tweetIds: [value.id_str]
            },
            fullText,
            hasBirdwatchNote: !!value.has_birdwatch_notes,
            hasGrokChatEmbed: false,
            hasQuotedTweet: !!value.is_quote_status,
            isExpandable: false,
            isTranslatable: !!value.translatable,
            isVisibilityRestricted: false,
            language: value.lang || 'zxx',
            isLiked: !!value.favorited,
            likesCount: value.favorite_count || 0,
            media,
            source,
            quoteTweetsCount: value.quote_count || 0,
            quotedTweet: value.quoted_status_id_str in opts.globalObjects.tweets
                // ? await fmt.next(Tweet, opts.globalObjects.tweets[value.quoted_status_id_str], { legacy: true, globalObjects: opts.globalObjects })
                ? await fmt.next(tweet, opts.globalObjects.tweets[value.quoted_status_id_str], { legacy: true, globalObjects: opts.globalObjects })
                : undefined,
            quotedTweetId: value.quoted_status_id_str || undefined,
            repliesCount: value.reply_count || 0,
            replyPermission: match(value.conversation_control?.policy as string | undefined, [
                ['Community', T.TweetReplyPermission.Following],
                ['Verified', T.TweetReplyPermission.Verified],
                ['ByInvitation', T.TweetReplyPermission.Mentioned]
            ], T.TweetReplyPermission.Everyone),
            replyingTo: !!value.in_reply_to_status_id_str ? {
                tweetId: value.in_reply_to_status_id_str,
                userId: value.in_reply_to_user_id_str,
                username: value.in_reply_to_screen_name
            } : undefined,
            isRetweeted: !!value.retweeted,
            retweetsCount: value.retweet_count || 0,
            text
        };
    }

    const media = await Promise.all(
        (value.legacy.entities.media as any[] ?? []).map(media => fmt.next(tweetMedia, media))
    );

    return {
        __typename: 'Tweet',
        id: value.rest_id,
        author: await fmt.next(user, value.core.user_results.result),
        birdwatchNote: value.birdwatch_pivot?.note?.rest_id ? {
            id: value.birdwatch_pivot.note.rest_id,
            text: (value.birdwatch_pivot.subtitle.entities as { fromIndex: number, toIndex: number, ref: { url: string } }[])
                .toSorted((a, b) => b.fromIndex - a.fromIndex)
                .reduce((acc, e) => acc.slice(0, e.fromIndex) + e.ref.url + acc.slice(e.toIndex), value.birdwatch_pivot.subtitle.text),
            translation: value.birdwatch_pivot.note.grok_translated_community_note_with_availability.is_available ? {
                text: value.birdwatch_pivot.note.grok_translated_community_note_with_availability.translation,
                language: value.birdwatch_pivot.note.grok_translated_community_note_with_availability.destination_language || 'zxx'
            } : undefined,
            language: value.birdwatch_pivot.note.language || 'zxx',
            isTranslatable: !!value.birdwatch_pivot.note.is_community_note_translatable,
            isPublic: value.birdwatch_pivot.visualStyle === 'Default' || value.birdwatch_pivot.title.includes('added context')
        } : undefined,
        isBookmarked: !!value.legacy.bookmarked,
        bookmarksCount: value.legacy.bookmark_count || 0,
        card: 'card' in value || ('voiceInfo' in value && value.legacy.extended_entities.media.length > 0)
            ? await fmt.next(cardResult, value.card.legacy, { tweet: value })
            : undefined,
        community: value.author_community_relationship?.community_results?.result
            ? await fmt.next(communityResult, value.author_community_relationship?.community_results?.result)
            : undefined,
        createdAt: new Date(value.legacy.created_at).toISOString(),
        contentDisclosures: {
            isAiGenerated: !!value.content_disclosure?.ai_generated_disclosure?.has_ai_generated_media,
            isSponsored: !!value.content_disclosure?.advertising_disclosure?.is_paid_promotion
        },
        isDownvoted: !!value.downvote_perspective?.is_downvoted,
        editing: {
            isAllowed: !!editControl?.is_edit_eligible,
            allowedUntil: new Date(Number(editControl?.editable_until_msecs || 0)).toISOString(),
            remainingCount: Number(editControl?.edits_remaining || 0),
            tweetIds: editControl?.edit_tweet_ids ?? [value.rest_id]
        },
        fullText,
        hasBirdwatchNote: !!value.has_birdwatch_notes,
        hasGrokChatEmbed: !!value.grok_share_attachment,
        hasQuotedTweet: !!value.legacy.is_quote_status,
        isExpandable: !!value.note_tweet?.is_expandable,
        isTranslatable: !!value.is_translatable,
        isVisibilityRestricted: opts.tweetInterstitial?.__typename === 'ContextualTweetInterstitial',
        language: value.legacy.lang || 'zxx',
        isLiked: !!value.legacy.favorited,
        likesCount: value.legacy.favorite_count || 0,
        media,
        source,
        quoteTweetsCount: value.legacy.quote_count || 0,
        quotedTweet: value.quoted_status_result?.result
            ? await fmt.next(tweet, value.quoted_status_result?.result)
            : undefined,
        quotedTweetId: value.legacy.quoted_status_id_str,
        repliesCount: value.legacy.reply_count || 0,
        replyPermission: match(value.legacy.conversation_control?.policy as string | undefined, [
            ['Community', T.TweetReplyPermission.Following],
            ['Verified', T.TweetReplyPermission.Verified],
            ['ByInvitation', T.TweetReplyPermission.Mentioned]
        ], T.TweetReplyPermission.Everyone),
        replyingTo: value.legacy.in_reply_to_status_id_str ? {
            tweetId: value.legacy.in_reply_to_status_id_str,
            userId: value.legacy.in_reply_to_user_id_str,
            username: value.legacy.in_reply_to_screen_name
        } : undefined,
        isRetweeted: !!value.legacy.retweeted,
        retweetsCount: value.legacy.retweet_count || 0,
        text,
        translation: value.grok_translated_post_with_availability?.data?.translation?.length ? {
            text: value.grok_translated_post_with_availability.data.translation,
            language: value.grok_translated_post_with_availability.data.destination_language || 'zxx'
        } : undefined,
        viewsCount: Number(value.views.count) || undefined,
        visibilityRestriction: !!visibilityRestrictionReason ? {
            type: opts.tweetInterstitial ? T.TweetRestrictionType.Full : T.TweetRestrictionType.Partial,
            reason: visibilityRestrictionReason
        } : undefined
    };
};

export const retweet: AsyncConstructor<T.Retweet, Record<string, any>, TweetLegacyOpts> = async (fmt, value, opts) => {
    if (opts.legacy) {
        return {
            __typename: 'Retweet',
            id: value.id_str,
            tweet: await fmt.next(tweet, opts.globalObjects.tweets[value.retweeted_status_id_str], { legacy: true, globalObjects: opts.globalObjects }),
            user: await fmt.next(user, opts.globalObjects.users[value.user_id_str], { legacy: true })
        };
    }

    return {
        __typename: 'Retweet',
        id: value.rest_id,
        tweet: await fmt.next(tweet, value.legacy.retweeted_status_result.result),
        user: await fmt.next(user, value.core.user_results.result)
    };
};

export const conversation: AsyncConstructor<T.Conversation, Record<string, any>, { members?: Set<string> }> = async (fmt, value, opts) => {
    let items = await Promise.all(
        (value.items as any[] || []).map(async item => item.item?.itemContent?.__typename === 'TimelineTimelineCursor'
            ? await fmt.next(cursor, item.item?.itemContent)
            : await fmt.next(tweetOrTombstone, item.item?.itemContent?.tweet_results?.result, { safe: false })
        )
    );

    let members = structuredClone<Set<string>>(opts.members ?? new Set());
    fmt.client.log?.debug('Conversation members here:', members);

    for (let item of items) {
        if (item.__typename !== 'Tweet' || !item.replyingTo?.username || !item.text.startsWith('@')) {
            continue;
        }

        const username = item.replyingTo.username.toLowerCase();
        if (!members.has(username)) {
            members.add(username);
        }

        while (/^@[a-zA-Z0-9_]/.test(item.text)) {
            const [, username] = item.text.match(/^@([a-zA-Z0-9_]+)/) ?? [];

            if (!username || !members.has(username.toLowerCase())) {
                break;
            }

            item.text = item.text
                .replace(new RegExp(`^\\@${username}`, 'i'), '')
                .trimStart();
        }
    }

    return {
        __typename: 'Conversation',
        allTweetIds: value.metadata?.conversationMetadata?.allTweetIds || [],
        items
    };
};

export const tweetTombstone: AsyncConstructor<T.TweetTombstone, string | undefined> = async (_, value) => {
    if (!value) {
        return {
            __typename: 'TweetTombstone',
            reason: T.TweetUnavailableReason.Unavailable
        };
    }

    const text = value.toLowerCase();

    return {
        __typename: 'TweetTombstone',
        reason: text?.includes('estimates your age')
            ? T.TweetUnavailableReason.AgeVerificationRequired
        : text?.includes('limits who can view')
            ? T.TweetUnavailableReason.AuthorProtected
        : text?.includes('suspended')
            ? T.TweetUnavailableReason.AuthorSuspended
        : text?.includes('no longer exists')
            ? T.TweetUnavailableReason.AuthorUnavailable
        : text?.includes('violated')
            ? T.TweetUnavailableReason.ViolatedRules
        : text?.includes('withheld')
            ? T.TweetUnavailableReason.Withheld
        : text?.includes('deleted')
            ? T.TweetUnavailableReason.Deleted
            : T.TweetUnavailableReason.Unavailable,
        message: value
    };
};

export const tweetOrTombstone: AsyncConstructor<T.Tweet | T.TweetTombstone, MaybeType> = async (fmt, value) => {
    const t = await fmt.next(tweetResult, value);

    if (t.__typename !== 'Tweet' && t.__typename !== 'TweetTombstone') {
        return fmt.next(tweetTombstone, undefined);
    }

    return t;
};

export const tweetResult: AsyncConstructor<T.TweetResult, MaybeType, TweetLegacyOpts> = async (fmt, value, opts) => {
    if (!value) {
        return await fmt.next(tweetTombstone, value);
    }

    if (opts.legacy && !!value.retweeted_status_id_str) {
        return await fmt.next(retweet, value, { legacy: true, globalObjects: opts.globalObjects });
    } else if (opts.legacy) {
        return await fmt.next(tweet, value, { legacy: true, globalObjects: opts.globalObjects });
    }

    const t = value.__typename === 'TweetWithVisibilityResults' ? value.tweet : value;

    if (t.__typename === 'TweetUnavailable' || t.__typename === 'TweetTombstone') {
        return await fmt.next(tweetTombstone, t.tombstone?.text?.text);
    }

    if (t.legacy.retweeted_status_result?.result) {
        return await fmt.next(retweet, t.legacy.retweeted_status_result.result);
    }

    return await fmt.next(tweet, t, { mediaVisibilityResults: value.mediaVisibilityResults, softInterventionPivot: value.softInterventionPivot, tweetInterstitial: value.tweetInterstitial });
};

export const draftTweet: AsyncConstructor<T.DraftTweet> = async (_, value) => {
    return {
        __typename: 'DraftTweet',
        id: value.rest_id,
        attachmentUrl: value.attachment_url,
        text: value.tweet_create_request?.status,
        mediaIds: value.tweet_create_request?.media_ids || [],
        thread: (value.tweet_create_request?.thread_tweets as any[] || []).map(tweet => ({
            text: tweet.status,
            mediaIds: tweet.mediaIds || []
        }))
    };
};

export const scheduledTweet: AsyncConstructor<T.ScheduledTweet> = async (fmt, value) => {
    const draft = await fmt.next(draftTweet, value);

    return {
        ...draft,
        __typename: 'ScheduledTweet',
        sendAt: new Date(value.scheduling_info).toISOString()
    };
};



// user.ts
export const user: AsyncConstructor<T.User, Record<string, any>, { legacy?: boolean }> = async (_, value, opts) => {
    if (opts.legacy) {
        return {
            __typename: 'User',
            id: value.id_str,
            affiliatesCount: 0,
            avatarUrl: value.profile_image_url_https.replace('normal', '400x400'),
            bannerUrl: value.profile_banner_url || undefined,
            canDm: !!value.can_dm,
            canMediaTag: !!value.can_media_tag,
            canSuperFollow: false,
            createdAt: new Date(value.created_at).toISOString(),
            description: value.description || '',
            followersCount: value.followers_count || 0,
            followingCount: value.friends_count || 0,
            isAutomated: false,
            isBlocked: !!value.blocking,
            isBlockedBy: !!value.blocked_by,
            isFollowed: !!value.following,
            isFollowRequested: !!value.follow_request_sent,
            isFollowedBy: !!value.followed_by,
            isMuted: !!value.muting,
            isSuperFollowed: false,
            isSuperFollowedBy: false,
            isTranslatable: false,
            location: value.location || undefined,
            name: value.name,
            protected: !!value.protected,
            superFollowingCount: 0,
            isSuperFollowingHidden: false,
            tweetsCount: value.statuses_count || 0,
            mediaCount: value.media_count || 0,
            likesCount: value.favorite_count || 0,
            listedCount: value.listed_count || 0,
            highlightedTweetsCount: 0,
            username: value.screen_name,
            verification: {
                type: !!value.ext_is_blue_verified ? T.VerificationType.Blue : T.VerificationType.Unverified,
                isVerified: !!value.ext_is_blue_verified,
                verifiedWithId: false
            },
            wantRetweets: !!value.want_retweets,
            wantNotifications: !!value.notification
        };
    }

    const isAutomated = value.affiliates_highlighted_label?.label?.userLabelType === 'AutomatedLabel';
    const affiliateLabel: T.User['affiliateLabel'] = !!value.affiliates_highlighted_label?.label?.badge?.url && !isAutomated ? {
        title: value.affiliates_highlighted_label.label.description,
        owner: value.affiliates_highlighted_label.label.url.url.split('.com/', 2)[1],
        imageUrl: value.affiliates_highlighted_label.label.badge.url
    } : undefined;

    const verified = !!value.verification?.verified || !!value.is_blue_verified;
    const verifiedType = value.verification?.verified_type;

    const verificationType: T.VerificationType = match(value.verification?.verified_type, [
        ['Government', T.VerificationType.Government],
        ['Business', T.VerificationType.Business],
        [[], T.VerificationType.BlueAffiliate, !verifiedType && !verified && !!affiliateLabel?.owner && new RegExp(`\\/${affiliateLabel.owner}$`, 'i').test(value.verification_info.reason?.description?.entities?.at(0)?.ref.url)],
        [[], T.VerificationType.Unverified, !verifiedType && !verified],
        [[], T.VerificationType.Blue, verified]
    ], T.VerificationType.Unverified);

    return {
        __typename: 'User',
        id: value.rest_id,
        affiliatesCount: value.business_account?.affiliates_count || 0,
        affiliateLabel,
        avatarUrl: value.avatar.image_url.replace('normal', '400x400'),
        bannerUrl: value.banner.image_url ?? value.legacy?.profile_banner_url,
        birthday: value.legacy_extended_profile?.birthdate ? {
            day: value.legacy_extended_profile.birthdate.day,
            month: value.legacy_extended_profile.birthdate.month,
            year: value.legacy_extended_profile.birthdate.year
        } : undefined,
        canDm: !!value.dm_permissions.can_dm,
        canMediaTag: !!value.media_permissions.can_media_tag,
        canSuperFollow: !!value.super_follow_eligible,
        createdAt: new Date(value.core.created_at).toISOString(),
        description: ((value.profile_bio?.description ?? value.legacy?.description ?? '') as string).replace(
            /\bhttps:\/\/t\.co\/[a-zA-Z0-9]+/,
            sub => value.legacy?.entities.description?.urls?.find((x: any) => x.url === sub)?.expanded_url.replace(/\/$/, '') || sub
        ),
        descriptionTranslation: value.grok_translated_bio_with_availability?.data?.translation?.text ? {
            text: value.grok_translated_bio_with_availability.data.translation,
            language: value.grok_translated_bio_with_availability.data.destination_language || 'zxx'
        } : undefined,
        fanAccountType: !value.parody_commentary_fan_label || value.parody_commentary_fan_label === 'None'
            ? undefined
            : value.parody_commentary_fan_label as T.FanAccountType,
        followersCount: value.relationship_counts?.followers || value.legacy?.followers_count,
        followingCount: value.relationship_counts?.following || value.legacy?.friends_count,
        isAutomated,
        isBlocked: !!value.relationship_perspectives.blocking,
        isBlockedBy: !!value.relationship_perspectives.blocked_by,
        isFollowed: !!value.relationship_perspectives.following,
        isFollowRequested: !!value.follow_request_sent || !!value.legacy?.follow_request_sent,
        isFollowedBy: !!value.relationship_perspectives.followed_by,
        isMuted: !!value.relationship_perspectives.muting,
        isSuperFollowed: !!value.super_following,
        isSuperFollowedBy: !!value.super_followed_by,
        isTranslatable: !!value.grok_translated_post_with_availability?.is_available || !!value.is_profile_translatable,
        job: value.professional?.category?.at(0)?.name,
        location: value.location?.location,
        name: value.core.name,
        pinnedTweetId: (value.pinned_items?.tweet_ids_str || value.legacy?.pinned_tweet_ids_str)?.at(0),
        protected: !!value.privacy.protected,
        superFollowingCount: value.creator_subscriptions_count || 0,
        isSuperFollowingHidden: !!value.has_hidden_subscriptions_on_profile,
        tweetsCount: value.tweets_count?.tweets || value.legacy?.statuses_count,
        mediaCount: value.tweets_count?.media_tweets || value.legacy?.media_count,
        likesCount: value.action_counts?.favorites_count || value.legacy?.favourites_count,
        // this property probably doesn't exist anymore
        listedCount: value.legacy?.listed_count || 0,
        highlightedTweetsCount: Number(value.highlights_info?.highlighted_tweets || 0),
        username: value.core.screen_name,
        url: (value.profile_bio.entities ?? value.legacy?.entities)?.url?.urls?.[0].expanded_url.replace(/^http:\/\//, 'https://').replace(/\/$/, ''),
        verification: {
            type: verificationType,
            isVerified: verified,
            verifiedSince: verified
                ? new Date(Number(value.verification_info?.reason?.verified_since_msec || 0)).toISOString()
                : undefined,
            verifiedWithId: !!value.verification_info?.is_identity_verified
        },
        wantRetweets: !!value.legacy?.want_retweets,
        wantNotifications: !!value.notifications_settings.notifications_enabled || !!value.legacy?.notifications
    };
};

export const unavailableUser: AsyncConstructor<T.UnavailableUser, string | undefined> = async (_, value) => {
    return {
        __typename: 'UnavailableUser',
        isSuspended: value === 'UnavailableUser'
    };
};

export const userResult: AsyncConstructor<T.UserResult, MaybeType, { legacy: boolean }> = async (fmt, value, opts) => {
    if (!value) {
        return fmt.next(unavailableUser, undefined);
    } else if (value.__typename !== 'User') {
        return fmt.next(unavailableUser, value.__typename);
    }

    return fmt.next(user, value, opts);
};

export const aboutUser: AsyncConstructor<T.AboutUser> = async (fmt, value) => {
    return {
        __typename: 'AboutUser',
        id: value.rest_id,
        avatarUrl: value.avatar.image_url.replace('normal', '400x400'),
        basedIn: value.about_profile?.account_based_in,
        createdAt: new Date(value.core.created_at).toISOString(),
        name: value.core.name,
        protected: !!value.privacy?.protected,
        verification: {
            type: !!value.is_blue_verified ? T.VerificationType.Blue : T.VerificationType.Unverified,
            isVerified: !!value.is_blue_verified,
            verifiedSince: !!value.verification_info?.reason?.verified_since_msec
                ? new Date(Number(value.verification_info.reason.verified_since_msec)).toISOString()
                : undefined,
            verifiedWithId: !!value.verification_info?.is_identity_verified
        },
        vpn: !!value.about_profile?.location_accurate,
        usernames: {
            changedCount: Number(value.username_changes?.count || 0),
            current: value.core.screen_name,
            updatedAt: !!value.username_changes?.last_changed_at
                ? new Date(Number(value.username_changes.last_changed_at)).toISOString()
                : undefined
        }
    };
};
