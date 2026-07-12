import type { Model, Type } from './internal/index.js';

/**
 * A current trend
 */
export interface Trend extends Type<'Trend'> {
    /** Optional topic or location context */
    context?: string,
    /** Names or hashtags of related trends */
    groupedTrends: string[],
    name: string,
    /** Amount of tweets relating to this trend */
    tweetsCount?: number
}
export const Trend: Model<Trend> = {
    async new(_, value) {
        return {
            __typename: 'Trend',
            context: value.trend_metadata?.domain_context,
            groupedTrends: (value.grouped_trends as any[] || [])?.map(trend => trend.name),
            name: value.name,
            // TODO
            tweetsCount: undefined
        };
    }
};
