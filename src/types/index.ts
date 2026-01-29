export * from './account.js';
export * from './birdwatch.js';
export * from './community.js';
export * from './list.js';
export * from './notifications.js';
export * from './search.js';
export * from './tweet.js';
export * from './user.js';

/**
 * Represents any timeline entry with a unique id
 */
export interface Entry<T extends { __typename: string }> {
    id: string,
    content: T
}

export interface Segment {
    id: string,
    name: string
}

/**
 * Represents a timeline slice
 */
export interface Slice<T extends { __typename: string }> {
    id?: string,
    segments?: Segment[],
    entries: Entry<T | Cursor>[]
}

/**
 * Represents a timeline cursor  
 * The direction shows where the timeline continues from
 */
export interface Cursor {
    __typename: 'Cursor',
    direction: CursorDirection,
    value: string
}

export type CursorDirection = 'Top' | 'Bottom' | 'ShowMore' | 'ShowSpam';
