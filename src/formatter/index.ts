import type { Cursor } from '../types/index.js';

export * from './account.js';
export * from './birdwatch.js';
export * from './community.js';
export * from './list.js';
export * from './notifications.js';
export * from './search.js';
export * from './tweet.js';
export * from './user.js';

export function cursor(value: any): Cursor {
    return {
        __typename: 'Cursor',
        direction: value.cursorType === 'Top'
            ? 'Top'
        : value.cursorType === 'ShowMore'
            ? 'ShowMore'
        : value.cursorType === 'ShowMoreThreads'
            ? 'ShowSpam'
            : 'Bottom',
        value: value.value
    };
}

export function getEntries<T>(instructions: { type?: string, entries?: T[] }[]): T[] {
    const pin = instructions.find(instruction => instruction.type === 'TimelinePinEntry') as { type: 'TimelinePinEntry', entry: T } | undefined;
    const entries = instructions.find(instruction => instruction.type === 'TimelineAddEntries')?.entries || [];

    if (pin) {
        return [pin.entry, ...entries];
    }

    return entries;
}
