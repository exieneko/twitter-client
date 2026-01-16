export * from './args.js';

/**
 * Response tuple containing `errors` and `data` if the errors aren't fatal
 * 
 * # Examples
 * 
 * Destructure tuple and handle errors before handling data:
 * 
 * ```ts
 * const [errors, entries] = await twitter.getTimeline();
 * 
 * if (!errors.length) {
 *     console.error(`errors: ${errors}`);
 *     return;
 * }
 * 
 * console.log(entries!.map(entry => entry.content));
 * ```
 * 
 * Or just assume there are no errors:
 * 
 * ```ts
 * const [, user] = await twitter.getUser('123456');
 * console.log(user?.name);
 * ```
 */
export type ClientResponse<T> = [ClientError[], T?];

export interface ClientError {
    code: number,
    message?: string
}



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



    includesAll(...words: string[]) {
        this.#parts.push(...words.map(this.escape));
        return this;
    }

    includesAllExact(...words: string[]) {
        this.#parts.push(...words.map(w => `"${w}"`));
        return this;
    }

    includesAny(...words: string[]) {
        this.#parts.push(this.or(words.map(this.escape)));
        return this;
    }

    includesAnyExact(...words: string[]) {
        this.#parts.push(this.or(words.map(w => `"${w}"`)));
        return this;
    }

    hashtagsAll(...hashtags: string[]) {
        this.#parts.push(...hashtags.map(h => `#${h.replaceAll('#', '')}`));
        return this;
    }

    hashtagsAny(...hashtags: string[]) {
        this.#parts.push(this.or(hashtags.map(h => `#${h.replaceAll('#', '')}`)));
        return this;
    }

    excludes(...words: string[]) {
        this.#parts.push(...words.map(w => `-${this.escape(w)}`));
        return this;
    }



    from(...users: string[]) {
        this.#parts.push(this.or(users.map(u => `from:${u.replaceAll('@', '')}`)))
        return this;
    }

    to(...users: string[]) {
        this.#parts.push(this.or(users.map(u => `to:${u.replaceAll('@', '')}`)))
        return this;
    }

    mentioning(...users: string[]) {
        this.#parts.push(this.or(users.map(u => `@${u.replaceAll('@', '')}`)))
        return this;
    }



    since(date: Date) {
        this.#parts.push(`since:${this.date(date)}`);
        return this;
    }

    until(date: Date) {
        this.#parts.push(`until:${this.date(date)}`);
        return this;
    }



    minLikes(count: number) {
        this.#parts.push(`min_faves:${count}`);
        return this;
    }

    minReplies(count: number) {
        this.#parts.push(`min_replies:${count}`);
        return this;
    }

    minRetweets(count: number) {
        this.#parts.push(`min_retweets:${count}`);
        return this;
    }



    filter(args: { name: 'media' | 'images' | 'videos' | 'links' | 'retweets' | 'replies' | 'quote' | 'verified' | 'blue_verified', exclude?: boolean }) {
        this.#parts.push(args.exclude ? `-filter:${args.name}` : `filter:${args.name}`);
        return this;
    }



    language(language: string) {
        this.#parts.push(`lang:${language}`);
        return this;
    }

    quotingTweet(id: string) {
        this.#parts.push(`quoted_tweet_id:${id}`);
        return this;
    }



    toString() {
        return this.#parts.map(s => s.trim()).join(' ');
    }
}
