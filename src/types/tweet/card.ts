import { User } from '../index.js';
import type { Model, Type, Wrapped } from '../internal/index.js';
import { assert } from '../../utils/index.js';

/**
 * Shared card data
 */
interface CardBase {
    cardName: string,
    cardUrl: string
}

export interface CardImage {
    width: number,
    height: number,
    url: string
}



/**
 * Embed of a website in a tweet
 */
export interface Embed extends CardBase, Type<'Embed'> {
    description: string,
    domain: string,
    thumbnail?: CardImage,
    title: string
}
export const Embed: Wrapped<CardKind, Model<Embed, Record<string, any>, CardOpts>> = {
    async new(_, value, { bv, get }) {
        return {
            __typename: 'Embed',
            cardName: value.name,
            cardUrl: value.url,
            description: get(bv, 'description')?.string_value || '',
            domain: get(bv, 'domain')?.string_value!,
            thumbnail: get(bv, 'thumbnail_image_original')?.image_value,
            title: get(bv, 'title')?.string_value!
        };
    },
    assert(value) {
        return assert(value, 'Embed');
    }
};

/**
 * Poll with 2-4 choices
 */
export interface Poll extends CardBase, Type<'Poll'> {
    choices: PollChoice[],
    /** Duration of the poll in seconds */
    duration: number,
    endsAt: string,
    totalVotesCount: number
}
export const Poll: Wrapped<CardKind, Model<Poll, Record<string, any>, CardOpts>> = {
    async new(fmt, value, { bv, get }) {
        const choiceCount = Number(get(bv, 'choice_count')?.string_value || 0);

        const choices = await Promise.all(
            [...Array(choiceCount).keys()].map(i => fmt.next(PollChoice, i, { bv, get }))
        );

        return {
            __typename: 'Poll',
            cardName: value.name,
            cardUrl: value.url,
            choices,
            duration: Number(get(bv, 'duration_minutes')?.string_value || 0) * 60,
            endsAt: new Date(get(bv, 'end_datetime_utc')?.string_value || 0).toISOString(),
            totalVotesCount: choices.reduce((acc, current) => acc + current.votesCount, 0)
        };
    },
    assert(value) {
        return assert(value, 'Poll');
    }
};

/**
 * Choice on a poll
 */
export interface PollChoice extends Type<'PollChoice'> {
    text: string,
    image?: CardImage,
    votesCount: number
}
export const PollChoice: Model<PollChoice, number, CardOpts> = {
    async new(_, index, { bv, get }) {
        const i = index + 1;

        return {
            __typename: 'PollChoice',
            text: get(bv, `choice${i}_label`)?.string_value || '',
            image: get(bv, `choice${i}_image`)?.image_value,
            votesCount: Number(get(bv, `choice${i}_count`)?.string_value || 0)
        };
    }
};

/**
 * Stream broadcast in a tweet
 */
export interface BroadcastCard extends CardBase, Type<'Broadcast'> {
    id: bigint,
    /** Author of the embedded broadcast */
    author: User,
    /** `true` if the broadcast has ended */
    hasEnded: boolean,
    /** Id of the broadcast video media */
    mediaId: bigint,
    mediaKey: string,
    thumbnail?: CardImage,
    title: string,
    width: number,
    height: number
}
export const BroadcastCard: Wrapped<CardKind, Model<BroadcastCard, Record<string, any>, CardOpts>> = {
    async new(fmt, value, { bv, get }) {
        return {
            __typename: 'Broadcast',
            id: BigInt(get(bv, 'broadcast_id')?.string_value!),
            author: await fmt.next(User, value.user_refs_results?.at(0)?.result, { legacy: false }),
            cardName: value.name,
            cardUrl: value.url,
            hasEnded: get(bv, 'broadcast_state')?.string_value?.toUpperCase() === 'ENDED',
            mediaId: BigInt(get(bv, 'broadcast_media_id')?.string_value!),
            mediaKey: get(bv, 'broadcast_media_key')?.string_value!,
            thumbnail: get(bv, 'broadcast_thumbnail_original')?.image_value,
            title: get(bv, 'title')?.string_value!,
            width: Number(get(bv, 'broadcast_width')?.string_value || 0),
            height: Number(get(bv, 'broadcast_height')?.string_value || 0)
        };
    },
    assert(value) {
        return assert(value, 'Broadcast');
    }
};

/**
 * Audiospace or audio message in a tweet
 * 
 * @todo
 */
export interface Audiospace extends CardBase, Type<'Audiospace'> {
    author: User
}
export const Audiospace: Wrapped<CardKind, Model<Audiospace, Record<string, any>, CardOpts>> = {
    async new(fmt, value, _) {
        return {
            __typename: 'Audiospace',
            author: await fmt.next(User, value.user_refs_results?.at(0)?.result, { legacy: true }),
            cardName: value.name,
            cardUrl: value.url
        };
    },
    assert(value) {
        return assert(value, 'Audiospace');
    }
};

// TODO: this is stupid
export type CardKind = Audiospace | BroadcastCard | Embed | Poll;
export const CardKind: Model<CardKind> = {
    async new(fmt, value) {
        const get: BVGetter = (bindingValues: { key: string, value: { boolean_value?: boolean, string_value?: string, image_value?: CardImage } }[], key: string) => {
            return bindingValues.find(v => v.key === key)?.value;
        };

        const bv = value.binding_values;
        const opts: CardOpts = { bv, get };

        if (value.name.includes(':audiospace')) {
            return await fmt.next(Audiospace, value, opts);
        } else if (value.name.includes(':broadcast')) {
            return await fmt.next(BroadcastCard, value, opts);
        } else if (value.name.includes(':poll')) {
            return await fmt.next(Poll, value, opts);
        }

        // :summary
        return await fmt.next(Embed, value, opts);
    }
};

type BVGetter = (bindingValues: {
    key: string,
    value: {
        boolean_value?: boolean,
        string_value?: string,
        image_value?: CardImage
    }
}[], key: string) => Parameters<BVGetter>[0][number]['value'] | undefined;

interface CardOpts {
    bv: any,
    get: BVGetter
}
