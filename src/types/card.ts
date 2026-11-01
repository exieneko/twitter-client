import type { User } from './index.js';
import type { Type } from './utils.js';

interface CardBase {
    cardName: string,
    cardUrl: string
}

/**
 * Image data in a card
 */
export interface CardImage {
    width: number,
    height: number,
    url: string
}

/**
 * Link embed card
 */
export interface Embed extends CardBase, Type<'Embed'> {
    description: string,
    domain: string,
    thumbnail?: CardImage,
    title: string
}

/**
 * Poll card with 2-4 choices
 */
export interface Poll extends CardBase, Type<'Poll'> {
    choices: PollChoice[],
    /** Duration of the poll in milliseconds */
    duration: number,
    endsAt: string,
    totalVotesCount: number
}

/**
 * Choice on a poll
 */
export interface PollChoice {
    text: string,
    image?: CardImage,
    votesCount: number
}

/**
 * Active live stream broadcast or its replay if it has ended
 */
export interface BroadcastCard extends CardBase, Type<'Broadcast'> {
    id: string,
    author: User,
    hasEnded: boolean,
    mediaId: string,
    mediaKey: string,
    thumbnail?: CardImage,
    title: string,
    width: number,
    height: number
}

/**
 * Audiospace or audio message in a tweet. The audio is actually a video in `Tweet.media`
 */
export interface Audiospace extends CardBase, Type<'Audiospace'> {
    author: User,
    /** Audiowaves for display purposes */
    audiowaves: number[],
    /** Duration in milliseconds */
    duration: number
}

export type CardResult = Audiospace | BroadcastCard | Embed | Poll;
