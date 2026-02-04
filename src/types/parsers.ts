import type { Cursor, Entry, SliceCursors } from './index.js';

export * from './account/parser.js';
export * from './birdwatch/parser.js';
export * from './community/parser.js';
export * from './discover/parser.js';
export * from './list/parser.js';
export * from './notifications/parser.js';
export * from './search/parser.js';
export * from './tweet/parser.js';
export * from './user/parser.js';

export function cursor(value: any): Cursor {
    return {
        __typename: 'Cursor',
        direction: value.cursorType === 'Top'
            ? 'Previous'
        : value.cursorType === 'ShowMore'
            ? 'ShowMore'
        : value.cursorType === 'ShowMoreThreads'
            ? 'ShowSpam'
            : 'Next',
        value: value.value
    };
}

export function cursorsOf<T extends { __typename: string }>(entries: Entry<T>[]): SliceCursors {
    const cursors = entries
        .filter(entry => entry.content.__typename === 'Cursor')
        .map(entry => entry as unknown as Entry<Cursor>);

    return {
        previous: cursors.find(entry => entry.content.direction === 'Previous')?.content.value,
        next: cursors.findLast(entry => entry.content.direction === 'Next')?.content.value
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
