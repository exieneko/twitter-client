/**
 * Utility class to build advanced search queries
 * 
 * @example
 * const query = new QueryBuilder()
 *     .includesAnyExact('this', 'that')
 *     .excludes('butNotThis')
 *     .from('exieneko')
 *     .toString();
 * 
 * assert(query === '("this" OR "that") -butNotThis from:exieneko');
 * 
 * @class
 * @since v0.7.0
 */
export class QueryBuilder {
    #parts: string[] = [];

    private wrap(s?: string) {
        return s ? `(${s})` : '';
    }

    private or(parts: string[]) {
        if (parts.length === 1) {
            return parts[0];
        }

        return this.wrap(parts.join(' OR '));
    }

    private date(date: Date) {
        return date.toISOString().split('T', 1)[0];
    }

    private escape(s: string) {
        return s.includes(' ') ? `"${s}"` : s;
    }



    /**
     * Search for tweets containing all of these words. This is the default search functionality
     * 
     * @param words Query
     * @returns `this`
     */
    includesAll(...words: string[]) {
        this.#parts.push(...words.map(this.escape));
        return this;
    }

    /**
     * Search for tweets containing all of these exact words
     * 
     * @param words Query
     * @returns `this`
     */
    includesAllExact(...words: string[]) {
        this.#parts.push(...words.map(w => `"${w}"`));
        return this;
    }

    /**
     * Search for tweets containing at least one of these words
     * 
     * @param words Query
     * @returns `this`
     */
    includesAny(...words: string[]) {
        this.#parts.push(this.or(words.map(this.escape)));
        return this;
    }

    /**
     * Search for tweets containing at least one of these exact words
     * 
     * @param words Query
     * @returns `this`
     */
    includesAnyExact(...words: string[]) {
        this.#parts.push(this.or(words.map(w => `"${w}"`)));
        return this;
    }

    /**
     * Search for tweets containing all of these hashtags
     * 
     * @param hashtags Hashtags
     * @returns `this`
     */
    hashtagsAll(...hashtags: string[]) {
        this.#parts.push(...hashtags.map(h => `#${h.replaceAll('#', '')}`));
        return this;
    }

    /**
     * Search for tweets containing at least one of these hashtags
     * 
     * @param hashtags Hashtags
     * @returns `this`
     */
    hashtagsAny(...hashtags: string[]) {
        this.#parts.push(this.or(hashtags.map(h => `#${h.replaceAll('#', '')}`)));
        return this;
    }

    /**
     * Do not include tweets containing any of these words
     * 
     * @param words Query
     * @returns `this`
     */
    excludes(...words: string[]) {
        this.#parts.push(...words.map(w => `-${this.escape(w)}`));
        return this;
    }



    /**
     * Search for tweets created by any of these users
     * 
     * @param users Usernames
     * @returns `this`
     */
    from(...users: string[]) {
        this.#parts.push(this.or(users.map(u => `from:${u.replaceAll('@', '')}`)))
        return this;
    }

    /**
     * Search for tweets in reply to any of these users
     * 
     * @param users Usernames
     * @returns `this`
     */
    to(...users: string[]) {
        this.#parts.push(this.or(users.map(u => `to:${u.replaceAll('@', '')}`)))
        return this;
    }

    /**
     * Search for tweets mentioning any of these users, by having "\@username" somewhere in the tweet
     * 
     * @param users Usernames
     * @returns `this`
     */
    mentioning(...users: string[]) {
        this.#parts.push(this.or(users.map(u => `@${u.replaceAll('@', '')}`)))
        return this;
    }



    /**
     * Search for tweets created after this date. Time will be ignored
     * 
     * @param date Minimum date
     * @returns `this`
     */
    since(date: Date) {
        this.#parts.push(`since:${this.date(date)}`);
        return this;
    }

    /**
     * Search for tweets created before this date. Time will be ignored
     * 
     * @param date Maximum date
     * @returns `this`
     */
    until(date: Date) {
        this.#parts.push(`until:${this.date(date)}`);
        return this;
    }



    /**
     * Exclude tweets with less likes than `count`
     * 
     * @param count Minimum likes count
     * @returns `this`
     */
    minLikes(count: number) {
        this.#parts.push(`min_faves:${count}`);
        return this;
    }

    /**
     * Exclude tweets with less replies than `count`
     * 
     * @param count Minimum replies count
     * @returns `this`
     */
    minReplies(count: number) {
        this.#parts.push(`min_replies:${count}`);
        return this;
    }

    /**
     * Exclude tweets with less retweets than `count`. Quote tweets don't count towards the number
     * 
     * @param count Minimum retweets count
     * @returns `this`
     */
    minRetweets(count: number) {
        this.#parts.push(`min_retweets:${count}`);
        return this;
    }



    /**
     * Apply a filter to the query, either including or excluding matching tweets
     * 
     * @param args Arguments
     * @param args.name Name of the filter
     * @param [args.exclude=false] Prefix the filter with "-" to exclude tweets instead?
     * @returns 
     */
    filter(args: { name: 'media' | 'images' | 'videos' | 'links' | 'retweets' | 'replies' | 'quote' | 'verified' | 'blue_verified', exclude?: boolean }) {
        this.#parts.push(args.exclude ? `-filter:${args.name}` : `filter:${args.name}`);
        return this;
    }



    /**
     * Search for tweets made in this language
     * 
     * @param language Language
     * @returns `this`
     */
    language(language: string) {
        this.#parts.push(`lang:${language}`);
        return this;
    }

    /**
     * Limit search to tweets quoting a particular tweet
     * 
     * @param id Quoted tweet id
     * @returns `this`
     */
    quotingTweet(id: string) {
        this.#parts.push(`quoted_tweet_id:${id}`);
        return this;
    }



    /**
     * Concatonates all parts into a string
     * 
     * @returns The query result
     */
    toString() {
        return this.#parts.map(s => s.trim()).join(' ');
    }
}
