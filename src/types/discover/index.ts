export interface Trend {
    __typename: 'Trend',
    context?: string,
    grouped_trends: string[],
    name: string,
    tweets_count?: number
}
