import type { TwitterClient } from '../client.js';
import type { Flags } from '../flags.js';
import type { TwitterFormatter } from '../fmt/index.js';

export type Enum<T> = T[keyof T];

export interface Type<K extends string = string> {
    /** Unique identifier for types used by GraphQL */
    __typename: K
}

export type AsyncConstructor<This, T = any, O extends Record<string, any> | null = null> = O extends null
    ? (fmt: TwitterFormatter, value: T) => Promise<This>
    : (fmt: TwitterFormatter, value: T, opts: O) => Promise<This>;



export interface Account {
    id: number,
    client: TwitterClient,
    // TODO: make this read the rate limit header instead of just increasing the count for every action
    uses: number
}

export interface Endpoint<P extends object = {}, V extends object = {}, T = any> {
    url: string,
    method: 'GET' | 'POST',
    params?: P,
    variables?: V,
    features?: Flags,
    token?: string,
    requiresTransactionId?: boolean,
    format: AsyncConstructor<T>
}

export const EndpointKind = {
    GraphQL: 'GraphQL',
    v11: 'v1.1',
    v2: 'v2',
    Media: 'Media'
} as const;
export type EndpointKind = Enum<typeof EndpointKind>;

type OptionalUndefined<T extends object | undefined> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type Params<T extends { params?: object }> = OptionalUndefined<T['params']>;
