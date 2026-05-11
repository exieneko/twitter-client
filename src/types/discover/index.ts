import type { Type } from '../internal.js';

/**
 * A current trend
 */
export interface Trend extends Type<'Trend'> {
    /** Optional topic or location context */
    context?: string,
    /** Names or hashtags of related trends */
    grouped_trends: string[],
    name: string,
    /** Amount of tweets relating to this trend */
    tweets_count?: number
}
