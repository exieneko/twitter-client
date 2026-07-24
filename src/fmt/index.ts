import { FormatterError, TwitterError } from './errors.js';
import type { TwitterClient } from '../client.js';
import type { Type } from '../types/internal/index.js';
import type { Model } from '../types/internal/model.js';
import { log } from '../utils/index.js';

export class TwitterFormatter {
    params: Map<string, any>;
    client: TwitterClient;
    depth = 0;
    errors: TwitterError[];

    constructor(client: TwitterClient, params?: object) {
        this.client = client;
        this.params = new Map(Object.entries(params ?? {}));
        this.errors = [];
    }



    private handleError<T>(cause: unknown): T {
        const error = new FormatterError('Error thrown during formatting', { cause });
        this.errors.push(error);

        log.err(this, error);

        return {
            __typename: 'Error',
            index: this.errors.length - 1
        } as T;
    }

    async format<T>(fn: (fmt: this, value: any) => Promise<T>, value: any): Promise<T | undefined> {
        this.depth++;

        try {
            return await fn(this, value);
        } catch (error) {
            return this.handleError(error);
        } finally {
            this.depth--;
        }
    }

    async next<M extends Model<any, any, any>, This extends Type = Awaited<ReturnType<M['new']>>, O = Parameters<M['new']>[2]>(model: M, value: Parameters<M['new']>[1], ...rest: [O] extends [null | undefined] ? [] : Required<O> extends O ? [opts?: O] : [opts: O]): Promise<This> {
        this.depth++;
        const opts = rest[0] ?? {};

        try {
            // @ts-ignore
            return await model.new(this, value, opts);
        } catch (error) {
            return this.handleError(error);
        } finally {
            this.depth--;
        }
    }

    async nextIf<M extends Model<any, any, any>, This extends Type = Awaited<ReturnType<M['new']>>, O = Parameters<M['new']>[2]>(model: M, value: Parameters<M['new']>[1], ...rest: [O] extends [null | undefined] ? [] : Required<O> extends O ? [opts?: O] : [opts: O]): Promise<This | undefined> {
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
