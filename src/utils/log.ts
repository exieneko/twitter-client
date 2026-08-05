import { inspect, styleText, type InspectColor } from 'node:util';
import { TwitterError } from '../fmt/errors.js';
import type { Range } from '../types/internal/range.js';

type LoggerValue = string | number | bigint | boolean | Record<string, any> | Set<LoggerValue> | LoggerValue[] | Range | Error | TwitterError | { toJSON(): object } | undefined;

interface StackTraceLine {
    isAsync: boolean,
    name?: string,
    path: string,
    line: number,
    column: number
}


export class Logger {
    #debug: number;

    constructor(debug: number) {
        this.#debug = debug;
    }

    protected wrap(s: string) {
        if (s.includes('"') && s.includes('\'')) {
            return `\`${s}\``;
        }
        if (s.includes('\'')) {
            return `"${s}"`;
        }
        return `'${s}'`;
    }

    protected displayItem(item: LoggerValue): (string | object)[] {
        if (item instanceof TwitterError) {
            const obj = item.toJSON();
            
            if ('name' in obj) {
                delete obj.name;
            }

            return [item.name, obj];
        }

        if (item instanceof Error) {
            return [`${item.name}(${this.wrap(item.message)})`];
        }

        const matches = item?.toString().match(/^\[object ([a-zA-Z0-9_\s\$]*)\]$/);
        if (item && matches) {
            const length = Object.entries(item).length;

            return [
                matches[1]?.includes(' ') ? `[${matches[1]}](${length})` : `${matches[1]}(${length})`,
                inspect(item, { colors: true, compact: false, depth: null }).replace(/^.*(?=\{)/, '')
            ];
        }

        return [String(item)];
    }

    protected log(level: 'trace' | 'debug' | 'info' | 'warn' | 'error', color: InspectColor, data: LoggerValue[]) {
        console[level](
            styleText('dim', new Date().toISOString()),
            styleText([color, 'bold'], `[${level.toUpperCase()}]`),
            ...data.flatMap(this.displayItem)
        );
    }

    trace(...data: LoggerValue[]): boolean {
        const ok = !!((this.#debug >>> 4) & 1);
        if (ok) this.log('trace', 'gray', data);
        return ok;
    }

    debug(...data: LoggerValue[]): boolean {
        const ok = !!((this.#debug >>> 3) & 1);
        if (ok) this.log('debug', 'magenta', data);
        return ok;
    }

    info(...data: LoggerValue[]): boolean {
        const ok = !!((this.#debug >>> 2) & 1);
        if (ok) this.log('info', 'cyan', data);
        return ok;
    }

    warn(...data: LoggerValue[]): boolean {
        const ok = !!((this.#debug >>> 1) & 1);
        if (ok) this.log('warn', 'yellow', data);
        return ok;
    }

    error(...data: LoggerValue[]): boolean {
        const ok = !!((this.#debug >>> 0) & 1);
        if (ok) this.log('error', 'red', data);
        return ok;
    }

    getStack(): StackTraceLine[] {
        let obj: { stack?: string } = {};
        Error.captureStackTrace?.(obj, this.getStack);

        return obj
            .stack
            ?.split('\n')
            .map(line => line.trim().match(/^at (?:(async)\s)?(?:([a-zA-Z0-9_\.\$<>]+) )?(?:\[.*\] )?\(?(?:file:.+\/dist\/([^:]+)|(node:[^:]+)):(\d+):(\d+)\)?$/))
            .filter(matches => !!matches)
            .map(matches => ({
                isAsync: matches[1] === 'async',
                name: matches[2],
                path: matches[3] || matches[4],
                line: Number(matches[5]),
                column: Number(matches[6])
            } satisfies StackTraceLine)) ?? [];
    }
}
