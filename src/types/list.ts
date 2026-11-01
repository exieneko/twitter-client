import type { User } from './index.js';
import type { Type } from './utils.js';

export interface List extends Type<'List'> {
    id: string,
    bannerUrl?: string,
    createdAt: string,
    creator: User,
    description: string,
    /** Whether the authenticated user is on the list */
    isListed: boolean,
    /** Amount of users on the list */
    listedCount: number,
    /** Whether the authenticated user has muted the list */
    muted: boolean,
    name: string,
    /** `Whether the list is pinned on the timelines of the authenticated user */
    isPinned: boolean,
    isPublic: boolean,
    /** Whether the authenticated user is subscribed to the list */
    isSubscribed: boolean,
    /** Amount of users subscribed to the list */
    subscribersCount: number
}

/**
 * Fallback type if a list is unavailable
 */
export interface UnavailableList extends Type<'UnavailableList'> {}

/**
 * Timeline list types
 */
export type ListResult = List | UnavailableList;
