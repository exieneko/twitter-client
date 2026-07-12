import type { TwitterClient } from '../client.js';
import { TwitterError } from '../types/index.js';
import type { Type } from '../types/internal/index.js';
import type { Model } from '../types/internal/model.js';
import { err, warn } from '../utils/index.js';

export class TwitterFormatter {
    client: TwitterClient;
    depth: number = 0;
    errors: TwitterError[] = [];

    constructor(client: TwitterClient) {
        this.client = client;
    }



    private handleError<T>(error: any): T {
        if (error instanceof TwitterError) {
            this.errors.push(error);
        } else {
            this.errors.push(new TwitterError(error));
        }

        err(this, `Error occured during parsing: ${error}`);

        this.depth--;

        if (this.depth < 0) {
            warn(this, `Formatter depth went below 0 (${this.depth})`);
        }

        try {
            return error as T;
        } catch {
            return { __typename: 'Error' } as T;
        }
    }

    async format<T>(fn: (fmt: this, value: any) => Promise<T>, value: any): Promise<T | undefined> {
        this.depth++;

        try {
            const result = await fn(this, value);
            this.depth--;
            return result;
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async next<M extends Model<any, any, any>, This extends Type = Awaited<ReturnType<M['new']>>>(model: M, value: Parameters<M['new']>[1], ...rest: [Parameters<M['new']>[2]] extends [null | undefined] ? [] : [opts: Parameters<M['new']>[2]]): Promise<This> {
        this.depth++;
        const opts = rest[0];

        try {
            // @ts-ignore
            const result = await model.new(this, await value, opts);
            this.depth--;
            return result;
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    async nextIf<M extends Model<any, any, any>, This extends Type = Awaited<ReturnType<M['new']>>>(model: M, value: Parameters<M['new']>[1], ...rest: [Parameters<M['new']>[2]] extends [null | undefined] ? [] : [opts: Parameters<M['new']>[2]]): Promise<This | undefined> {
        if (typeof value === 'undefined' || value === null) {
            return;
        }

        // @ts-ignore
        return await this.next(model, value, rest[0]);
    }

    entries(instructions: { type?: string, entries?: any[] }[]): any[] {
        const pin = instructions.find(instruction => instruction.type === 'TimelinePinEntry') as { type: 'TimelinePinEntry', entry: any } | undefined;
        const entries = instructions.find(instruction => instruction.type === 'TimelineAddEntries')?.entries || [];

        if (pin) {
            return [pin.entry, ...entries];
        }

        return entries;
    }
}
