import type { Slice, TwitterResponse } from '../index.js';
import type { Enum, Model, Type } from '../internal/index.js';

/**
 * Entry in a timeline containing the item
 */
export interface Entry<T extends Type> {
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
export type Timeline<T extends Type> = AsyncGenerator<TwitterResponse<Slice<T>>, TwitterResponse<Slice<T>>, unknown>;



/**
 * Represents a timeline cursor. The direction shows where the timeline continues from
 */
export interface Cursor extends Type<'Cursor'> {
    direction: CursorDirection,
    value: string
}
export const Cursor: Model<Cursor> = {
    async new(_, value) {
        return {
            __typename: 'Cursor',
            direction: value.cursorType === 'Top'
                ? CursorDirection.Previous
            : value.cursorType === 'ShowMore'
                ? CursorDirection.ShowMore
            : value.cursorType === 'ShowMoreThreads'
                ? CursorDirection.ShowSpam
                : CursorDirection.Next,
            value: value.value
        };
    }
};

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
