import { Conversation, Cursor, CursorDirection, ListKind, Notification, Trend, Tweet, TweetKind, UserKind, type Entry, type TimelineSegment } from '../index.js';
import type { Default, Model, Type, WithMethods } from '../internal/index.js';

/**
 * Slice of a timeline
 */
export interface Slice<T extends Type> extends Type<'Slice'> {
    name?: string,
    segments?: TimelineSegment[],
    /** Timeline entries in this slice */
    entries: Entry<T | Cursor>[],
    /** Cloned top and bottom cursor values in `entries` */
    cursors: {
        previous?: string,
        next?: string
    }
}
export const Slice: Model<Slice<Type>, Entry<Type>[], { body?: Record<string, any> }> & WithMethods<[
    ['discover', TweetKind | Trend, { body: Record<string, any> }],
    ['list', ListKind, { type: 'Default' | 'Discovery' }],
    ['notifications', Notification],
    ['search', TweetKind | UserKind | ListKind, { searchItemType: 'Tweet' | 'User' | 'List' }],
    ['trends', Trend],
    ['tweets', TweetKind, { type: 'Default' } | { type: 'Birdwatch', body: Record<string, any> } | { type: 'Media', gridModule?: { content: object, key: string } } | { type: 'DeviceFollow', globalObjects: Record<string, any> }],
    ['users', UserKind]
]> & Default<Slice<any>> = {
    async new(_, value, opts) {
        const cursors = value.filter(entry => entry.content.__typename === 'Cursor') as Entry<Cursor>[];

        return {
            __typename: 'Slice',
            entries: value,
            cursors: {
                previous: cursors.find(entry => entry.content.direction === CursorDirection.Previous)?.content.value,
                next: cursors.findLast(entry => entry.content.direction === CursorDirection.Next)?.content.value
            },
            name: opts.body?.initialTimeline.id,
            segments: (opts.body?.timelines as any[] | undefined)?.map(timeline => ({
                id: timeline.timeline.id,
                name: timeline.id
            } satisfies TimelineSegment))
        };
    },
    async discover(fmt, value, opts) {
        const entries = await Promise.all(
            fmt
                .entries(value)
                .filter(entry => /^(?:trend|tweet|cursor)-/.test(entry.entryId))
                .map(async entry => ({
                    id: entry.entryId,
                    content: entry.entryId.startsWith('trend-')
                        ? await fmt.next(Trend, entry.content.itemContent)
                    : entry.entryId.startsWith('tweet-')
                        ? await fmt.next(Trend, entry.content.itemContent)
                        : await fmt.next(Cursor, entry.content)
                } satisfies Entry<TweetKind | Trend>))
        );

        return await fmt.next(this, entries, { body: opts.body });
    },
    async list(fmt, value, opts) {
        let entries: Entry<ListKind | Cursor>[];

        if (opts.type === 'Discovery') {
            const v = fmt
                .entries(value)
                .find(entry => entry.entryId.includes('discovery'))?.content?.items as any[] || [];

            entries = await Promise.all(
                v.map(async entry => ({
                    id: entry.entryId,
                    content: await fmt.next(ListKind, entry.item.itemContent.list)
                } satisfies Entry<ListKind>))
            );
        } else {
            entries = await Promise.all(
                fmt
                    .entries(value)
                    .map(async entry => ({
                        id: entry.entryId,
                        content: entry.content?.__typename === 'TimelineTimelineCursor'
                            ? await fmt.next(Cursor, entry.content)
                            : await fmt.next(ListKind, entry.content.itemContent.list)
                    } satisfies Entry<ListKind | Cursor>))
            );
        }

        return await fmt.next(this, entries, {});
    },
    async notifications(fmt, value) {
        const entries = await Promise.all(
            fmt
                .entries(value)
                .map(async entry => ({
                    id: entry.entryId,
                    content: entry.content?.__typename === 'TimelineTimelineCursor'
                        ? await fmt.next(Cursor, entry.content)
                        : await fmt.next(Notification, entry.content.itemContent, { kind: entry.content.clientEventInfo.element })
                } satisfies Entry<Notification | Cursor>))
        );

        return await fmt.next(this, entries, {});
    },
    async search(fmt, value, opts) {
        if (opts.searchItemType === 'Tweet') {
            return Slice.tweets(fmt, value, { type: 'Default' });
        } else if (opts.searchItemType === 'User') {
            return Slice.users(fmt, value);
        }

        const entries = [
            ...fmt
                .entries(value)
                .filter(entry => entry?.content?.__typename === 'TimelineTimelineCursor')
                .map(async entry => ({
                    id: entry.entryId,
                    content: await fmt.next(Cursor, entry.cursor)
                } satisfies Entry<Cursor>)),
            ...fmt
                .entries(value)
                .find(entry => entry.entryId === 'list-search-0')
                ?.content
                ?.items
                ?.filter((entry: any) => /^list-search-\d-list-\d+/.test(entry.entryId))
                .map(async (entry: any) => ({
                    id: entry.entryId,
                    content: await fmt.next(ListKind, entry.content.itemContent.list)
                } satisfies Entry<ListKind>))
        ];

        return await fmt.next(this, await Promise.all(entries), {})
    },
    async trends(fmt, value) {
        const entries = await Promise.all(
            (fmt.entries(value).at(0)?.content?.items as any[] || [])?.map(async (item, i) => ({
                id: `trend_${i}`,
                content: await fmt.next(Trend, item.item.itemContent)
            } satisfies Entry<Trend>))
        );

        return await fmt.next(this, entries, {});
    },
    async tweets(fmt, value, opts) {
        let entries: Promise<Entry<TweetKind | Cursor> | undefined>[];

        switch (opts.type) {
            case 'Media':
                const grid = opts.gridModule?.content ?? fmt.entries(value).find(entry => entry.content.__typename === 'TimelineTimelineModule')?.content;
                const items: any[] = grid?.[opts.gridModule?.key ?? 'items'] || [];

                entries = [
                    ...fmt
                        .entries(value)
                        .filter(entry => entry.content.__typename === 'TimelineTimelineCursor')
                        .map(async entry => ({
                            id: entry.entryId,
                            content: await fmt.next(Cursor, entry.content)
                        } satisfies Entry<TweetKind | Cursor>)),
                    ...items
                        .map(async item => ({
                            id: item.entryId,
                            content: item.item.itemContent.__typename === 'TimelineTimelineCursor'
                                ? await fmt.next(Cursor, item.item.itemContent)
                                : await fmt.next(TweetKind, item.item.itemContent.tweet_results?.result)
                        } satisfies Entry<TweetKind | Cursor>))
                ];
                break;
            case 'DeviceFollow':
                entries = value
                    .map(async entry => {
                        const id: string = entry.entryId;

                        if ('operation' in entry.content) {
                            return {
                                id,
                                content: await fmt.next(Cursor, entry.content.operation.cursor)
                            } satisfies Entry<Cursor>;
                        }

                        const tweetId = entry.content.item.content.tweet.id;
                        const tweet = opts.globalObjects.tweets[tweetId];
                        const author = opts.globalObjects.users[tweet.user_id_str];
                        const quotedTweet = tweet.quoted_status_id_str ? opts.globalObjects.tweet[tweet.quoted_status_id_str] : undefined;
                        const quotedTweetAuthor = quotedTweet ? opts.globalObjects.users[quotedTweet.user_id_str] : undefined;

                        return {
                            id,
                            content: await fmt.next(Tweet, tweet, { legacy: true, author, quotedTweet, quotedTweetAuthor })
                        };
                    });
                break;
            default:
                entries = fmt
                    .entries(value)
                    .map<typeof entries[number]>(async entry => {
                        const id: string = entry.entryId;

                        if (entry.content.__typename === 'TimelineTimelineCursor') {
                            return {
                                id,
                                content: await fmt.next(Cursor, entry.content)
                            };
                        } else if (entry.content.__typename === 'TimelineTimelineItem' && !id.includes('promoted') && id.includes('tweet')) {
                            return {
                                id,
                                content: await fmt.next(TweetKind, entry.content.itemContent.tweet_results?.result)
                            };
                        } else if (entry.content.__typename === 'TimelineTimelineModule' && id.includes('conversation')) {
                            if (entry.content.items.at(0)?.entryId.includes('promoted')) {
                                return;
                            }

                            return {
                                id,
                                content: await fmt.next(Conversation, entry.content)
                            };
                        }
                    });
                break;
        }

        const result = await Promise
            .all(entries)
            .then(arr => arr.filter(entry => !!entry));

        return await fmt.next(this, result, opts.type === 'Birdwatch' ? { body: opts.body } : {});
    },
    async users(fmt, value) {
        const entries = await Promise.all(
            fmt
                .entries(value)
                .map(async entry => ({
                    id: entry.entryId,
                    content: entry.content.__typename === 'TimelineTimelineCursor'
                        ? await fmt.next(Cursor, entry.content)
                        : await fmt.next(UserKind, entry.content.itemContent?.user_results?.result, { legacy: false })
                } satisfies Entry<UserKind | Cursor>))
        );
    
        return await fmt.next(this, entries, {});
    },
    default() {
        return {
            __typename: 'Slice',
            entries: [],
            cursors: {}
        };
    }
};
