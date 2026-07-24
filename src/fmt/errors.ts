import type { Range, Endpoint, EndpointParams } from '../types/internal/index.js';

export abstract class TwitterError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = new.target.name;
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

    constructor(message: string, options: Required<ErrorOptions>) {
        super(message, options);
        this.cause = options.cause;
    }
}

export interface RequestErrorOptions<EP extends Endpoint> extends ErrorOptions {
    endpoint: EP,
    params?: EndpointParams<EP>
}

/**
 * Same as `ClientError`, but also contains data about the endpoint and parameters being sent
 */
export class RequestError<EP extends Endpoint> extends ClientError implements RequestErrorOptions<EP> {
    readonly endpoint: EP;
    readonly params?: EndpointParams<EP>;

    constructor(message: string, options: RequestErrorOptions<EP>) {
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

export interface ApiErrorOptions extends ErrorOptions {
    code: number,
    kind: string,
    path?: string[]
}

/**
 * Error returned by the Twitter API in the response data
 */
export class ApiError extends TwitterError implements ApiErrorOptions {
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
export interface ValidationErrorOptions<T, U = T> extends ErrorOptions {
    field: string,
    value: T,
    expected: (T extends number ? T | U | Range : T | U)[] | 'string' | 'number' | 'bigint' | 'boolean' | 'undefined' | 'object' | 'function'
}

/**
 * Validation error thrown client side. Will prevent a request from being sent
 */
export class ValidationError<T, U = T> extends TwitterError implements ValidationErrorOptions<T, U> {
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
