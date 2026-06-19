import type { User } from '../index.js';
import type { Type } from '../internal.js';

/**
 * A Twitter list. Lists contain users whose tweets can be viewed on the list's timeline
 */
export interface List extends Type<'List'> {
    id: bigint,
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

/**
 * Fallback type if a list is unavailable
 */
export interface UnavailableList extends Type<'UnavailableList'> {}

/**
 * Timeline list types
 */
export type ListKind = List | UnavailableList;
