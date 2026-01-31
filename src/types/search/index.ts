/**
 * Represents live search results
 */
export interface Typeahead {
    results_count: number,
    topics: string[],
    user_ids: string[],
    query: string
}
