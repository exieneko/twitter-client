/**
 * Live search typeahead
 */
export interface Typeahead {
    resultsCount: number,
    topics: string[],
    userIds: bigint[],
    query: string
}
