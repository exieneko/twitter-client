import type { Type } from './utils.js';

export interface Trend extends Type<'Trend'> {
    /** Optional topic or location context */
    context?: string,
    /** Names or hashtags of related trends */
    groupedTrends: string[],
    name: string,
    /** Amount of tweets relating to this trend */
    tweetsCount?: number
}
