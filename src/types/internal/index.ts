import type { Endpoint } from './endpoint.js';
import type { TwitterClient } from '../../client.js';
import type { TwitterFormatter } from '../../fmt/index.js';

export * from './endpoint.js';
export * from './model.js';

export type AsyncConstructor<This extends Type, T = Record<string, any>, Opts extends Record<string, any> | null = null> = [Opts] extends [null]
    ? (fmt: TwitterFormatter, value: T) => Promise<This>
    : (fmt: TwitterFormatter, value: T, opts: Opts) => Promise<This>;

export type Enum<T, U = null> = U extends null
    ? Extract<T[keyof T], string> extends never
        ? T[keyof T]
        : Extract<T[keyof T], string>
    : Extract<T[keyof T], U>;

export interface Type<K extends string = string> {
    readonly __typename: K
}

type OptionalUndefined<T extends object | undefined> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export type EndpointParams<E extends Endpoint> = OptionalUndefined<E['_params']>;
export type PartialBy<T extends object, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type MaybeType<T extends string = string> = (Type<T> & Record<string, any>) | undefined;

export interface Account {
    id: number,
    client: TwitterClient,
    // TODO: make this read the rate limit header instead of just increasing the count for every action
    uses: number
}
