import type { BirdwatchHelpfulTag, BirdwatchUnhelpfulTag } from './birdwatch.js';

export * from './account.js';
export * from './birdwatch.js';
export * from './community.js';
export * from './list.js';
export * from './notifications.js';
export * from './search.js';
export * from './tweet.js';
export * from './user.js';

export * from './internal/index.js';

/**
 * Represents any timeline entry
 */
export interface Entry<T> {
    id: string,
    content: T
}

/**
 * Represents a timeline cursor\
 * The direction shows where the timeline continues from
 */
export interface Cursor {
    __typename: 'Cursor',
    direction: CursorDirection,
    value: string
}

export enum CursorDirection {
    Top = 'Top',
    Bottom = 'Bottom',
    ShowMore = 'ShowMore',
    ShowSpam = 'ShowMoreThreads'
}
