import { QueryBuilder } from './querybuilder.js';

/**
 * Represents 
 * 
 * @since 1.0.0-rc1
 */
export interface Query {
    /**
     * Text included in the tweet's text or its author's display name
     * 
     * If the value is a `string`, it will be treated as a regular query  
     * If it's a `string[]`, each item will be surrounded by quotes, and all have to be present in the tweet
     * 
     * ### Result
     * 
     * If `string`:
     * 
     * `word phrase one phrase two`
     * 
     * If `string[]`:
     * 
     * `word "phrase one" "phrase two"`
     */
    includes?: string | string[],

    /**
     * Only show tweets made after this date
     * 
     * Acceptable formats:
     * 
     * String: `'2023-12-31'`,  
     * Tuple: `[2023, 12, 31]`,  
     * Date: `new Date()`
     * 
     * ### Result
     * 
     * `since:2023-12-31`
     */
    after?: string | [number, number, number] | Date,
    /**
     * Only show tweets made before this date
     * 
     * ### Acceptable formats:
     * 
     * String: `'2023-12-31'`,  
     * Tuple: `[2023, 12, 31]`,  
     * Date: `new Date()`
     * 
     * ### Result
     * 
     * `until:2023-12-31`
     */
    before?: string | [number, number, number] | Date,

    // filters
    /**
     * Filter tweets that contain images or videos (not gifs)
     * 
     * ### Result
     * 
     * `filter:media`
     */
    hasMedia?: boolean,
    /**
     * Filter tweets that contain images
     * 
     * ### Result
     * 
     * `filter:images`
     */
    hasImage?: boolean,
    /**
     * Filter tweets that contain videos (not gifs)
     * 
     * ### Result
     * 
     * `filter:videos`
     */
    hasVideo?: boolean,
    /**
     * Filter tweets that contain links. This includes quote tweets, images, videos, gifs, audiospaces, message requests, etc.
     * 
     * ### Result
     * 
     * `filter:links`
     */
    hasLink?: boolean,
    /**
     * Filter tweets that are quoting another tweet
     * 
     * ### Result
     * 
     * `filter:quote`
     */
    isQuoteTweet?: boolean,
    /**
     * Filter replies
     * 
     * ### Result
     * 
     * `filter:replies`
     */
    isReply?: boolean,
    /**
     * Filter retweets. The search will still apply to the tweet being retweeted
     * 
     * ### Result
     * 
     * `filter:retweets`
     */
    isRetweet?: boolean,
    /**
     * Filter tweets from verified users
     * 
     * ### Result
     * 
     * `filter:verified`
     */
    isVerified?: boolean,

    interactions?: {
        /**
         * Minimum amount of likes on the tweet
         * 
         * ### Result
         * 
         * `min_faves:123`
         */
        minLikes?: number,
        /**
         * Minimum amount of replies on the tweet
         * 
         * ### Result
         * 
         * `min_replies:123`
         */
        minReplies?: number,
        /**
         * Minimum amount of retweets on the tweet
         * 
         * ### Result
         * 
         * `min_retweets:123`
         */
        minRetweets?: number
    },

    /**
     * Language of the tweet
     * 
     * ### Result
     * 
     * `lang:en`
     */
    language?: string,
    /**
     * Limit search to tweets quoting a particular tweet
     * 
     * ### Result
     * 
     * `quoted_tweet_id:20000000000000000000`
     */
    quotedTweetId?: string | number | bigint,

    // users
    /**
     * Username of the tweet author
     * 
     * ### Result
     * 
     * `from:jack`
     */
    author?: string,
    /**
     * Username of the user being replied to
     * 
     * ### Result
     * 
     * `to:jack`
     */
    replyingTo?: string,
    /**
     * Usernames of users \@mentioned in the tweet or conversation
     * 
     * ### Result
     * 
     * `@jack`
     */
    users?: string[],

    /**
     * Apply negative filters to the query
     * 
     * @example
     * <caption>`this -that -filter:retweets`</caption>
     * 
     * await twitter.search({
     *     includes: 'this',
     *     NOT: {
     *         includes: 'that',
     *         isRetweet: true
     *     }
     * });
     */
    NOT?: Query,
    /**
     * Add an OR statement to the query
     * 
     * @example
     * <caption>`-filter:replies (this OR (that from:jack))`</caption>
     * 
     * await twitter.search({
     *     NOT: {
     *         isReply: true
     *     },
     *     OR: [
     *         {
     *             includes: 'this'
     *         }
     *         {
     *             includes: 'that',
     *             author: 'jack'
     *         }
     *     ]
     * });
     */
    OR?: Query[]
}

type QueryExpr = { type: 'token', value: string } | { type: 'not', children: QueryExpr[] } | { type: 'and', children: QueryExpr[] } | { type: 'or', children: QueryExpr[] };



function parseDate(date: string | [number, number, number] | Date) {
    if (date instanceof Date) {
        return date.toISOString().split('T', 1)[0];
    }

    if (Array.isArray(date)) {
        return `${date[0]}-${date[1].toString().padStart(2, '0')}-${date[2].toString().padStart(2, '0')}`;
    }

    return date;
}

function negative(expr: QueryExpr): string[] {
    switch (expr.type) {
        case 'not':
            return expr.children.map(exprToString);
        case 'and':
        case 'or':
            return expr.children.flatMap(negative);
        default:
            return [`-${expr.value}`];
    }
}

function escape(value: string): string {
    if (/^[a-zA-Z0-9_]+$/.test(value) && value.trim().toUpperCase() !== 'OR') {
        return value;
    }

    return `"${value.replace(/"/g, '\\"')}"`;
}

function flatten(expr: QueryExpr): QueryExpr[] {
    if (expr.type === 'or') {
        return expr.children;
    }

    return [expr];
}



function buildExpr(query: Query): QueryExpr {
    let result: QueryExpr[] = [];

    if (typeof query.includes === 'string') {
        result.push({
            type: 'token',
            value: query.includes
        });
    } else if (query.includes?.length) {
        for (const value of query.includes) {
            result.push({
                type: 'token',
                value: escape(value)
            });
        }
    }

    if (query.after) {
        result.push({
            type: 'token',
            value: `since:${parseDate(query.after)}`
        });
    }
    if (query.before) {
        result.push({
            type: 'token',
            value: `until:${parseDate(query.before)}`
        });
    }

    if (query.hasMedia) {
        result.push({
            type: 'token',
            value: `filter:media`
        });
    }
    if (query.hasImage) {
        result.push({
            type: 'token',
            value: `filter:images`
        });
    }
    if (query.hasVideo) {
        result.push({
            type: 'token',
            value: `filter:videos`
        });
    }
    if (query.hasLink) {
        result.push({
            type: 'token',
            value: `filter:links`
        });
    }
    if (query.isQuoteTweet) {
        result.push({
            type: 'token',
            value: `filter:quote`
        });
    }
    if (query.isReply) {
        result.push({
            type: 'token',
            value: `filter:replies`
        });
    }
    if (query.isRetweet) {
        result.push({
            type: 'token',
            value: `filter:retweets`
        });
    }
    if (query.isVerified) {
        result.push({
            type: 'token',
            value: `filter:verified`
        });
    }

    if (query.interactions?.minLikes) {
        result.push({
            type: 'token',
            value: `min_faves:${query.interactions.minLikes}`
        });
    }
    if (query.interactions?.minReplies) {
        result.push({
            type: 'token',
            value: `min_replies:${query.interactions.minReplies}`
        });
    }
    if (query.interactions?.minRetweets) {
        result.push({
            type: 'token',
            value: `min_retweets:${query.interactions.minRetweets}`
        });
    }

    if (query.language) {
        result.push({
            type: 'token',
            value: `lang:${query.language}`
        });
    }
    if (query.quotedTweetId) {
        result.push({
            type: 'token',
            value: `quoted_tweet_id:${query.quotedTweetId}`
        });
    }

    if (query.author) {
        result.push({
            type: 'token',
            value: `from:${query.author.replaceAll('@', '')}`
        });
    }
    if (query.replyingTo) {
        result.push({
            type: 'token',
            value: `to:${query.replyingTo.replaceAll('@', '')}`
        });
    }
    if (query.users?.length) {
        for (const user of query.users) {
            result.push({
                type: 'token',
                value: `@${user.replaceAll('@', '')}`
            });
        }
    }

    if (query.NOT) {
        result.push({
            type: 'not',
            children: flatten(buildExpr(query.NOT))
        });
    }
    if (query.OR?.length) {
        result.push({
            type: 'or',
            children: query.OR.map(buildExpr)
        });
    }

    return {
        type: 'and',
        children: result
    };
}

function exprToString(expr: QueryExpr): string {
    switch (expr.type) {
        case 'and':
            return expr
                .children
                .map(child => {
                    const s = exprToString(child);
                    return child.type === 'or' ? `(${s})` : s;
                })
                .join(' ');
        case 'not':
            return expr
                .children
                .flatMap(negative)
                .join(' ');
        case 'or':
            return expr
                .children
                .map(child => {
                    const s = exprToString(child);
                    return child.type === 'and' && child.children.length > 1 ? `(${s})` : s;
                })
                .join(' OR ');
        default:
            return expr.value;
    }
}

export function parseQuery(query: string | Query | QueryBuilder): string {
    if (typeof query === 'string') {
        return query;
    } else if (query instanceof QueryBuilder) {
        return query.toString();
    }

    const expr = buildExpr(query)
    return exprToString(expr);
}
