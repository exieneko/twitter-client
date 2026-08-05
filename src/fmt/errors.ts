import type { Range, Endpoint, EndpointParams, RequiredBy } from '../types/internal/index.js';
import type { Logger } from '../utils/log.js';

export interface TwitterErrorOptions extends ErrorOptions {
    log?: Logger
}

export abstract class TwitterError extends Error {
    constructor(message: string, options?: TwitterErrorOptions) {
        super(message, options);
        this.name = new.target.name;

        options?.log?.error(this);
    }

    toJSON(): object {
        return {
            name: this.name,
            message: this.message
        };
    }
}

/**
 * Error thrown during formatting API response data
 */
export class FormatterError extends TwitterError {}

/**
 * Error caused by divine intervention
 */
export class DivineInterventionError extends TwitterError {
    static UNKNOWN = new this('An unknown error occured');
}

/**
 * Error thrown by other modules or functions. `cause` is required
 */
export class ClientError extends TwitterError {
    cause: unknown;

    constructor(message: string, options: RequiredBy<TwitterErrorOptions, 'cause'>) {
        super(message, options);
        this.cause = options.cause;
    }
}

export interface RequestErrorOptions<E extends Endpoint> extends TwitterErrorOptions {
    endpoint: E,
    params?: EndpointParams<E>
}

/**
 * Same as `ClientError`, but also contains data about the endpoint and parameters being sent
 */
export class RequestError<E extends Endpoint> extends ClientError implements Omit<RequestErrorOptions<E>, 'log'> {
    readonly endpoint: E;
    readonly params?: EndpointParams<E>;

    constructor(message: string, options: RequestErrorOptions<E>) {
        super(message, { cause: options.cause });
        this.endpoint = options.endpoint;
        this.params = options.params;
    }

    toJSON(): object {
        return {
            ...super.toJSON(),
            endpoint: this.endpoint.toJSON(),
            params: this.params
        };
    }
}

export interface ApiErrorOptions extends TwitterErrorOptions {
    code: number,
    kind: string,
    path?: string[]
}

/**
 * Error returned by the Twitter API in the response data
 */
export class ApiError extends TwitterError implements Omit<ApiErrorOptions, 'log'> {
    readonly code: number;
    readonly kind: string;
    readonly path?: string[];

    constructor(message: string, options: Partial<ApiErrorOptions>) {
        super(message, { cause: options.cause });
        this.code = options.code ?? 0;
        this.kind = options.kind ?? 'Unknown';
        this.path = options.path;
    }

    toJSON(): object {
        return {
            ...super.toJSON(),
            code: this.code,
            kind: this.kind,
            path: this.path
        };
    }
}

/**
 * Item representing an invalid field in a `ValidationError`
 */
export interface ValidationErrorOptions<T, U = T> extends TwitterErrorOptions {
    field: string,
    value: T,
    expected: (T extends number ? T | U | Range : T | U)[] | 'string' | 'number' | 'bigint' | 'boolean' | 'undefined' | 'object' | 'function'
}

/**
 * Validation error thrown client side. Will prevent a request from being sent
 */
export class ValidationError<T, U = T> extends TwitterError implements Omit<ValidationErrorOptions<T, U>, 'log'> {
    readonly field: ValidationErrorOptions<T, U>['field'];
    readonly value: ValidationErrorOptions<T, U>['value'];
    readonly expected: ValidationErrorOptions<T, U>['expected'];

    constructor(message: string, options: ValidationErrorOptions<T, U>) {
        super(message, { cause: options?.cause });
        this.field = options.field;
        this.value = options.value;
        this.expected = options.expected;
    }

    toJSON(): object {
        return {
            ...super.toJSON(),
            field: this.field,
            value: this.value,
            expected: this.expected
        };
    }
}
