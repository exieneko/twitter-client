export * from './args.js';
export * from './internal.js';

export * from './account/index.js';
export * from './birdwatch/index.js';
export * from './community/index.js';
export * from './discover/index.js';
export * from './list/index.js';
export * from './notifications/index.js';
export * from './search/index.js';
export * from './tweet/index.js';
export * from './user/index.js';

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

export interface SliceCursors {
    previous?: string,
    next?: string
}

/**
 * Represents a timeline slice
 */
export interface Slice<T extends { __typename: string }> {
    name?: string,
    segments?: Segment[],
    entries: Entry<T | Cursor>[],
    cursors: SliceCursors
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

export type CursorDirection = 'Previous' | 'Next' | 'ShowMore' | 'ShowSpam';
