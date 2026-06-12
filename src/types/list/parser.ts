import type { List, ListKind, Slice, User } from '../index.js';
import * as p from '../parsers.js';

export function list(value: any): ListKind {
    if (!value || !value.created_at) {
        return { __typename: 'UnavailableList' }
    }

    return {
        __typename: 'List',
        id: value.id_str,
        bannerUrl: value.custom_banner_media.media_info.original_img_id,
        createdAt: new Date(value.created_at).toISOString(),
        creator: p.user(value.user_results?.result) as User,
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
