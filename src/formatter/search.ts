import type { Slice, TimelineList, TimelineTweet, TimelineUser, Typeahead } from '../types/index.js';
import { cursor, entries, getEntries, list, mediaEntries, userEntries } from './index.js';

export function typeahead(value: any): Typeahead {
    return {
        results_count: value.num_results,
        topics: (value.topics || []).map((topic: any) => topic.topic),
        user_ids: (value.users || []).map((user: any) => user.id_str),
        query: value.query
    };
}

export function searchEntries(instructions: any): Slice<TimelineTweet | TimelineUser | TimelineList> {
    const value: any[] = getEntries(instructions);

    if (value.at(0)?.entryId?.includes('tweet') || value.at(5)?.entryId.includes('tweet')) {
        return entries(instructions);
    }

    if (value.at(0)?.entryId?.includes('user') || value.at(5)?.entryId.includes('user')) {
        return userEntries(instructions);
    }

    if (value.length <= 3 && value.at(0)?.entryId === 'search-grid-0') {
        return mediaEntries(instructions);
    }

    if (value.length <= 3 && !!value.find(entry => entry.entryId === 'list-search-0')) {
        const entries = value.find(entry => entry.entryId === 'list-search-0')?.content?.items;

        return {
            entries: [
                ...value.filter(entry => entry?.content?.__typename === 'TimelineTimelineCursor').map(entry => ({
                    id: entry.entryId,
                    content: cursor(entry.content)
                })),
                ...(
                    value.map(entry => ({
                        id: entry.entryId,
                        content: entry.entryId.includes('cursor')
                            ? cursor(entry.content)
                            : list(entry.content.itemContent.list)
                    }))
                )
            ]
        };
    }

    return { entries: [] };
}
