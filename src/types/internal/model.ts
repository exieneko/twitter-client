import type { AsyncConstructor, Type } from './index.js';

export interface Model<This extends Type, T = Record<string, any>, Opts extends Record<string, any> | null = null> {
    new: AsyncConstructor<This, T extends null ? Record<string, any> : T, Opts>
}
export type Wrapped<T extends Type, M extends Model<This, any, any>, This extends T = Awaited<ReturnType<M['new']>>> = M & {
    assert(value: T): This
};

export interface Default<T> {
    default(): T
}
