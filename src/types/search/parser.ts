import type { Slice, ListKind, TweetKind, UserKind, Typeahead } from '../index.js';
import * as p from '../parsers.js';

export function typeahead(value: any): Typeahead {
    return {
        results_count: value.num_results,
        topics: (value.topics || []).map((topic: any) => topic.topic),
        user_ids: (value.users || []).map((user: any) => user.id_str),
        query: value.query
    };
}

export function searchEntries(instructions: any): Slice<TweetKind | UserKind | ListKind> {
    const value: any[] = p.getEntries(instructions);

    if (value.at(0)?.entryId?.includes('tweet') || value.at(5)?.entryId.includes('tweet')) {
        return p.entries(instructions);
    }

    if (value.at(0)?.entryId?.includes('user') || value.at(5)?.entryId.includes('user')) {
        return p.entries(instructions);
    }

    if (value.length <= 3 && value.at(0)?.entryId === 'search-grid-0') {
        return p.entries(instructions);
    }

    if (value.length <= 3 && !!value.find(entry => entry.entryId === 'list-search-0')) {
        const entries = value.find(entry => entry.entryId === 'list-search-0')?.content?.items;

        return {
            entries: p.sortEntries([
                ...value.filter(entry => entry?.content?.__typename === 'TimelineTimelineCursor').map(entry => ({
                    id: entry.entryId,
                    content: p.cursor(entry.content)
                })),
                ...(
                    value.map(entry => ({
                        id: entry.entryId,
                        content: entry.entryId.includes('cursor')
                            ? p.cursor(entry.content)
                            : p.list(entry.content.itemContent.list)
                    }))
                )
            ])
        };
    }

    return { entries: [] };
}
