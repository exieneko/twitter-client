import type { List, ListKind, Slice, UnavailableList, User } from '../index.js';
import * as p from '../parsers.js';

export function list(value: any): List | UnavailableList {
    if (!value || !value.created_at) {
        return { __typename: 'UnavailableList' }
    }

    return {
        __typename: 'List',
        id: value.id_str,
        banner_url: value.custom_banner_media.media_info.original_img_id,
        created_at: new Date(value.created_at).toISOString(),
        creator: p.user(value.user_results?.result) as User,
        description: value.description || '',
        listed: !!value.is_member,
        listed_count: value.member_count || 0,
        muted: !!value.muting,
        name: value.name,
        pinned: !!value.pinning,
        public: value.mode === 'Public',
        subscribed: !!value.following,
        subscribers_count: value.subscriber_count || 0
    };
}



export function listEntries(instructions: any): Slice<ListKind> {
    const value: any[] = p.getEntries(instructions);

    const entries = value.map(entry => ({
        id: entry.entryId,
        content: entry.entryId.includes('cursor')
            ? p.cursor(entry.content)
            : list(entry.content.itemContent.list)
    }));

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}

export function listDiscoveryEntries(instructions: any): Slice<List> {
    // @ts-ignore
    const value: any[] = p.getEntries(instructions).find((entry: any) => entry.entryId.includes('discovery'))?.content?.items || [];

    const entries = value.map(entry => ({
        id: entry.entryId,
        content: list(entry.item.itemContent.list) as List
    }));

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}
