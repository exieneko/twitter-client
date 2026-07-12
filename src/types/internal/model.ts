import type { AsyncConstructor, Type } from './index.js';
import type { Slice } from '../timeline/slice.js';

export interface Model<This extends Type, T = Record<string, any>, Opts extends Record<string, any> | null = null> {
    new: AsyncConstructor<This, T extends null ? Record<string, any> : T, Opts>
}
export type Wrapped<T extends Type, M extends Model<This, any, any>, This extends T = Awaited<ReturnType<M['new']>>> = M & {
    assert(value: T): This
};

export type WithMethods<T extends readonly (readonly [string, Type, (Record<string, any> | undefined | null)?])[]> = {
    [P in T[number] as P[0]]: AsyncConstructor<Slice<P[1]>, any[], P[2] extends Record<string, any> ? P[2] : null>
};

export interface Default<T> {
    default(): T
}
