import type { Model, Type } from './internal/index.js';

/**
 * Live search typeahead
 */
export interface Typeahead extends Type<'SearchTypeahead'> {
    resultsCount: number,
    topics: string[],
    userIds: string[],
    query: string
}
export const Typeahead: Model<Typeahead> = {
    async new(_, value) {
        return {
            __typename: 'SearchTypeahead',
            resultsCount: value.num_results,
            topics: (value.topics as any[] || []).map(topic => topic.topic),
            userIds: (value.users as any[] || []).map(user => user.id_str),
            query: value.query
        };
    }
};
