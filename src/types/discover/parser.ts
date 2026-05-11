import type { Slice, Trend, TweetKind } from '../index.js';
import * as p from '../parsers.js';

export function discoverEntries(body: any): Slice<TweetKind | Trend> {
    const entries = p.getEntries(body.initialTimeline.timeline.timeline.instructions)
        .map((e: any) => ({
            id: e.entryId as string,
            content: e.entryId.startsWith('trend-')
                ? trend(e.content.itemContent)
            : e.entryId.startsWith('tweet-')
                ? p.entry(e)?.content
            : e.entryId.startsWith('cursor-')
                ? p.cursor(e.content)
                : undefined as any
        }))
        .filter(x => !!x);

    return {
        name: body.initialTimeline.id,
        segments: body.timelines.map((timeline: any) => ({
            id: timeline.timeline.id,
            name: timeline.id
        })) || [],
        entries,
        cursors: p.cursorsOf(entries)
    };
}



export function trend(value: any): Trend {
    return {
        __typename: 'Trend',
        context: value.trend_metadata?.domain_context,
        grouped_trends: value.grouped_trends?.map((trend: any) => trend.name) || [],
        name: value.name,
        tweets_count: undefined
    };
}

export function trendEntries(instructions: any): Slice<Trend> {
    const value: any[] = p.getEntries(instructions);

    const entries = value.at(0)?.content?.items?.map((t: any) => trend(t.item.itemContent)) || [];

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}
