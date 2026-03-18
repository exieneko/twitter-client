import logger from 'node-color-log';
import type { TwitterClient } from '../client.js';
import { TwitterError } from '../types/index.js';
import type { AsyncConstructor } from '../types/internal.js';

export class TwitterFormatter {
    client: TwitterClient;
    depth: number = 0;
    errors: TwitterError[] = [];

    constructor(client: TwitterClient) {
        this.client = client;
    }



    async next<This, Fn extends AsyncConstructor<This, any>>(fn: Fn, value: Parameters<Fn>[1]): Promise<This>;
    async next<This, Fn extends AsyncConstructor<This, any, Record<string, any>>>(fn: Fn, value: Parameters<Fn>[1], opts: Parameters<Fn>[2]): Promise<This>;

    async next<This, Fn extends AsyncConstructor<This, any, Record<string, any> | null>>(fn: Fn, value: Parameters<Fn>[1], opts?: Parameters<Fn>[2]): Promise<This> {
        this.depth++;

        try {
            // @ts-ignore
            const result = await fn(this, value, opts);
            this.depth--;
            return result;
        } catch (error: any) {
            if (error instanceof TwitterError) {
                this.errors.push(error);
            } else {
                this.errors.push(new TwitterError(error));
            }

            if (this.client.options.verbose) {
                logger.error(`Error occured during parsing: ${error}`);
            }

            this.depth--;

            if (this.depth < 0 && this.client.options.verbose) {
                logger.warn(`Formatter \`depth\` went below 0 (${this.depth})`);
            }

            try {
                return error as This;
            } catch {
                return { __typename: 'Error' } as This;
            }
        }
    }
}
