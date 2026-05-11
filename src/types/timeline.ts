import type { TwitterResponse } from './index.js';
import type { Enum, Type } from './internal.js';

/**
 * Entry in a timeline containing the item
 */
export interface Entry<T extends Type<string>> {
    id: string,
    content: T
}

/**
 * Segment in a timeline, if the timeline uses Twitter's SegmentedTimelines feature
 */
export interface TimelineSegment {
    id: string,
    name: string
}

/**
 * Slice of a timeline
 */
export interface Slice<T extends Type<string>> {
    name?: string,
    segments?: TimelineSegment[],
    /** Timeline entries in this slice */
    entries: Entry<T | Cursor>[],
    /** Cloned top and bottom cursor values in `entries` */
    cursors: {
        previous?: string,
        next?: string
    }
}


/**
 * `AsyncGenerator` yielding a slice of `T`, where `T` is always an item inside of a timeline entry. Will return an empty slice when done
 * 
 * @example
 * const timeline = twitter.getTimeline();
 * const { value, done } = await timeline.next();
 * 
 * // `value` is always a `TwitterResponse`
 * const { errors, data } = value;
 * 
 * @see {@link TwitterResponse}
 */
export type Timeline<T extends Type<string>> = AsyncGenerator<TwitterResponse<Slice<T>>, TwitterResponse<Slice<T>>, unknown>;



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
