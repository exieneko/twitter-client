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
