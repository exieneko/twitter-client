import { User } from './index.js';
import type { Default, Model, Type, Wrapped } from './internal/index.js';
import { assert } from '../utils/index.js';

/**
 * A Twitter list. Lists contain users whose tweets can be viewed on the list's timeline
 */
export interface List extends Type<'List'> {
    id: string,
    bannerUrl?: string,
    createdAt: string,
    creator: User,
    description: string,
    /** `true` if you're on this list */
    isListed: boolean,
    /** Amount of users on this list */
    listedCount: number,
    /** `true` if you've muted this list */
    muted: boolean,
    name: string,
    /** `true` if this list is pinned on your timelines */
    isPinned: boolean,
    /** `true` if this list is visible to everyone */
    isPublic: boolean,
    /** `true` if you're subscribed to this list */
    isSubscribed: boolean,
    /** Amount of users subscribed to this list */
    subscribersCount: number
}
export const List: Wrapped<ListKind, Model<List>> = {
    async new(fmt, value) {
        return {
            __typename: 'List',
            id: value.id_str,
            bannerUrl: value.custom_banner_media.media_info.original_img_id,
            createdAt: new Date(value.created_at).toISOString(),
            creator: await fmt.next(User, value.user_results?.result),
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
    },
    assert(value) {
        return assert(value, 'List');
    }
};

/**
 * Fallback type if a list is unavailable
 */
export interface UnavailableList extends Type<'UnavailableList'> {}
export const UnavailableList: Wrapped<ListKind, Model<UnavailableList>> & Default<UnavailableList> = {
    async new() {
        return this.default();
    },
    assert(value) {
        return assert(value, 'UnavailableList');
    },
    default() {
        return {
            __typename: 'UnavailableList'
        };
    }
};

/**
 * Timeline list types
 */
export type ListKind = List | UnavailableList;
export const ListKind: Model<ListKind> = {
    async new(fmt, value) {
        if (!value || !value.created_at) {
            return await fmt.next(UnavailableList, value);
        }

        return await fmt.next(List, value);
    }
};
