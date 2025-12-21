import type { Cursor, User } from './index.js';

/**
 * Represents a Twitter user list
 */
export interface List {
    __typename: 'List',
    id: string,
    /** The url for the list's banner, `undefined` if none is set */
    banner_url?: string,
    /** The list's creation datetime as an ISO string */
    created_at: string,
    creator: User,
    description: string,
    /** Whether or not you're on this list, including your tweets being displayed on its timeline */
    listed: boolean,
    /** Amount of users on this list */
    listed_count: number,
    /** Whether or not you've muted the list */
    muted: boolean,
    /** The list's display name */
    name: string,
    /** Whether or not the list is pinned on your timelines */
    pinned: boolean,
    /** Whether or not the list is visible to everyone */
    public: boolean,
    /** Whether or not you're subscribed to the list */
    subscribed: boolean,
    /** Amount of users subscribed to the list */
    subscribers_count: number
}

/**
 * Represents an unavailable list as a fallback
 */
export interface UnavailableList {
    __typename: 'UnavailableList'
}

/**
 * Union type representing all list types that can be present in a timeline
 */
export type TimelineList = List | UnavailableList | Cursor;
