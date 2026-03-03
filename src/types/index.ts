import type { Enum } from './internal.js';

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

export interface Type<S extends string> {
    /** Unique identifier for types used by GraphQL */
    __typename: S
}

/**
 * Entry in a timeline containing the item
 */
export interface Entry<T extends Type<U>, U extends string = string> {
    id: string,
    content: T
}

/**
 * Segment in a timeline, if the timeline uses Twitter's SegmentedTimelines feature
 */
export interface Segment {
    id: string,
    name: string
}

export interface SliceCursors {
    previous?: string,
    next?: string
}

/**
 * Slice of a timeline
 */
export interface Slice<T extends Type<U>, U extends string = string> {
    name?: string,
    segments?: Segment[],
    /** Timeline entries in this slice */
    entries: Entry<T | Cursor>[],
    /** Cloned top and bottom cursor values in `entries` */
    cursors: SliceCursors
}

/**
 * Represents a timeline cursor. The direction shows where the timeline continues from
 */
export interface Cursor extends Type<'Cursor'> {
    direction: CursorDirection,
    value: string
}

/**
 * Cursor type showing what fetching the next slice of the timeline with the cursor will do
 * 
 * @enum
 */
export const CursorDirection = {
    /** Top of the timeline */
    Previous: 'Previous',
    /**
     * Bottom of the timeline
     * 
     * @default
     */
    Next: 'Next',
    /** Show more replies under a tweet */
    ShowMore: 'ShowMore',
    /** Show possible spam replies under a tweet */
    ShowSpam: 'ShowSpam'
} as const;
export type CursorDirection = Enum<typeof CursorDirection>;
