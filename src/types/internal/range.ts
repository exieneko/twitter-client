/**
 * Represents a valid range for numbers if a `ValidationError<number>` is thrown.
 * 
 * @throws {RangeError} if `start` or `end` is NaN, or if an inclusive range has no end (1..=)
 */
export class Range {
    start: number;
    end: number;
    inclusive: boolean;

    constructor(start: number | null, end: number | null, inclusive?: boolean);
    constructor(s: RangeString);

    constructor(arg0: RangeString | number | null, arg1?: number | null, arg2?: boolean) {
        let start: number;
        let end: number;
        let inclusive = false;

        if (typeof arg0 === 'string') {
            let [first, second] = arg0.split('..', 2);

            if (second.startsWith('=')) {
                inclusive = true;
                second = second.replace(/^\=/, '');
            }

            start = first.trim() === '' ? -Infinity : Number(first);
            end = second.trim() === '' ? Infinity : Number(second);

            if (Number.isNaN(end)) {
                inclusive = false;
            }
        } else {
            start = arg0 ?? -Infinity;
            end = arg1 ?? Infinity;
            inclusive = !!arg2;
        }

        if (isNaN(start) || isNaN(end)) {
            throw new RangeError('Range start or end can\'t be NaN');
        }

        if (!isFinite(start) && inclusive) {
            throw new RangeError('Inclusive ranges must have an end');
        }

        this.start = start;
        this.end = end;
        this.inclusive = inclusive;
    }

    at(index: number) {
        return this.toArray().at(index);
    }

    contains(num: number) {
        return num >= this.start && (num < this.end || (num <= this.end && this.inclusive));
    }

    isEmpty() {
        return this.start > this.end || (this.start >= this.end && this.inclusive);
    }

    length() {
        return this.end - this.start + Number(this.inclusive);
    }

    toArray() {
        return [...Array(this.end + Number(this.inclusive)).keys()].slice(this.start);
    }

    toString(radix?: number | undefined) {
        const start = this.start.toString(radix).repeat(Number(isFinite(this.start)));
        const end = this.end.toString(radix).repeat(Number(isFinite(this.end)));

        return `${start}..${'='.repeat(Number(this.inclusive))}${end}`;
    }

    toJSON() {
        return this.toString() as RangeString;
    }

    *[Symbol.iterator]() {
        yield* this.toArray();
    }
}

export type RangeString = `${number | ''}..${number | ''}` | `${number | ''}..=${number}`;
