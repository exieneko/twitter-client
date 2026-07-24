import { Conversation, Cursor, CursorDirection, ListKind, Notification, Trend, TweetKind, UserKind, type Entry, type TimelineSegment } from '../index.js';
import type { AsyncConstructor, Default, Model, Type } from '../internal/index.js';
import { ENDPOINTS } from '../../consts.js';

type SliceMethods<T extends readonly (readonly [string, Type, (Record<string, any> | undefined | null)?])[]> = {
    [P in T[number] as P[0]]: AsyncConstructor<Slice<P[1]>, any[], P[2] extends Record<string, any> ? P[2] : null>
};

export interface SliceCursors {
    previous: string,
    next: string
}

// TODO: this could be replaced with Entry<T | Cursor>[] if segmentedtimelines is moved to TwitterResponse?
/**
 * Slice of a timeline
 */
export interface Slice<T extends Type> extends Type<'Slice'> {
    name?: string,
    segments?: TimelineSegment[],
    /** Timeline entries in this slice */
    entries: Entry<T | Cursor>[],
    /**
     * Cloned top and bottom cursor values in `entries`
     * 
     * @deprecated Use `Slice.cursors()` instead
     */
    cursors: Partial<SliceCursors>
}
export const Slice: Model<Slice<Type>, Entry<Type>[], { body?: Record<string, any> }> & SliceMethods<[
    ['discover', TweetKind | Trend, { root: Record<string, any> }],
    ['lists', ListKind, { type: 'Default' | 'Discovery' }],
    ['notifications', Notification],
    ['search', TweetKind | UserKind | ListKind],
    ['trends', Trend],
    ['tweets', TweetKind, { type: 'Default' } | { type: 'Birdwatch', root: Record<string, any> } | { type: 'Media', gridModule?: { content: object, key: string } } | { type: 'DeviceFollow', globalObjects: Record<string, any> }],
    ['users', UserKind]
]> & Default<Slice<any>> & { cursors<T extends Type>(value: Slice<T>): Partial<SliceCursors> } = {
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

        return await fmt.next(this, entries, { body: opts.root });
    },
    async lists(fmt, value, opts) {
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
    async search(fmt, value) {
        const product: typeof ENDPOINTS.SearchTimeline._params.product = fmt.params.get('product');

        if (product === 'People') {
            return Slice.users(fmt, value);
        } else if (product !== 'Lists') {
            return Slice.tweets(fmt, value, { type: 'Default' });
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

        return await fmt.next(this, await Promise.all(entries));
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
        let entries: Entry<TweetKind | Cursor>[];

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
                            content: await fmt.next(Cursor, entry.content)
                        } satisfies Entry<Cursor>)),
                    ...items
                        .map(async item => ({
                            id: item.entryId,
                            content: item.item.itemContent.__typename === 'TimelineTimelineCursor'
                                ? await fmt.next(Cursor, item.item.itemContent)
                                : await fmt.next(TweetKind, item.item.itemContent.tweet_results?.result)
                        } satisfies Entry<TweetKind | Cursor>))
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
                                    content: await fmt.next(Cursor, entry.content.operation.cursor)
                                } satisfies Entry<Cursor>;
                            }

                            const tweetId = entry.content.item.content.tweet.id;
                            const tweet = opts.globalObjects.tweets[tweetId];

                            return {
                                id,
                                content: await fmt.next(TweetKind, tweet, { legacy: true, globalObjects: opts.globalObjects as any })
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
                            content: await fmt.next(Cursor, entry.content)
                        });
                        continue;
                    } else if (entry.content.__typename === 'TimelineTimelineItem' && !id.includes('promoted') && id.includes('tweet')) {
                        const content = await fmt.next(TweetKind, entry.content.itemContent.tweet_results?.result);

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
                            content: await fmt.next(Conversation, entry.content, { members: conversationMembers })
                        });
                        continue;
                    }
                }
                break;
        }

        return await fmt.next(this, entries, opts.type === 'Birdwatch' ? { body: opts.root } : {});
    },
    async users(fmt, value) {
        const entries = await Promise.all(
            fmt
                .entries(value)
                .map(async entry => ({
                    id: entry.entryId,
                    content: entry.content.__typename === 'TimelineTimelineCursor'
                        ? await fmt.next(Cursor, entry.content)
                        : await fmt.next(UserKind, entry.content.itemContent?.user_results?.result)
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
    },
    cursors(value) {
        const cursors = value.entries.filter((entry): entry is Entry<Cursor> => entry.content.__typename === 'Cursor');

        return {
            previous: cursors.find(entry => entry.content.direction === CursorDirection.Previous)?.content.value,
            next: cursors.findLast(entry => entry.content.direction === CursorDirection.Next)?.content.value
        };
    }
};
