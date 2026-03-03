import type { Type, User } from '../index.js';

/**
 * A Twitter list. Lists contain users whose tweets can be viewed on the list's timeline
 */
export interface List extends Type<'List'> {
    id: string,
    banner_url?: string,
    created_at: string,
    creator: User,
    description: string,
    /** `true` if you're on this list */
    is_listed: boolean,
    /** Amount of users on this list */
    listed_count: number,
    /** `true` if you've muted this list */
    muted: boolean,
    name: string,
    /** `true` if this list is pinned on your timelines */
    is_pinned: boolean,
    /** `true` if this list is visible to everyone */
    is_public: boolean,
    /** `true` if you're subscribed to this list */
    is_subscribed: boolean,
    /** Amount of users subscribed to this list */
    subscribers_count: number
}

/**
 * Fallback type if a list is unavailable
 */
export interface UnavailableList {
    __typename: 'UnavailableList'
}

/**
 * Timeline list types
 */
export type ListKind = List | UnavailableList;
