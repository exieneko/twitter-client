import type { Enum, Type } from '../internal.js';

/**
 * Single Birdwatch note
 */
export interface BirdwatchNote extends Type<'BirdwatchNote'> {
    id: bigint,
    author: BirdwatchUser,
    /** `true` if the note is added due to the media content of the tweet */
    byMedia: boolean,
    /** `true` if the note is added due to a url contained in the tweet */
    byUrl: boolean,
    createdAt: string,
    /** `true` if the note contains links to trustworthy sources */
    hasTrustworthySources: boolean,
    lang: string,
    /** Amount of tweets with matching media that will also be Birdwatch noted */
    mediaMatchesCount: number,
    /** Note's current display status */
    status: BirdwatchNoteStatus,
    /** Tags assigned to the note by the author */
    tags: ({
        __typename: 'MisleadingTweet',
        /** The note's claims of why the tweet needs a Birdwatch note */
        tweetMisleadingTags: BirdwatchTweetMisleadingTag[]
    } | {
        __typename: 'NoNoteNeeded',
        /** The note's claims of why no notes are needed on this tweet */
        tweetNotMisleadingTags: BirdwatchTweetNotMisleadingTag[]
    }) & {
        /** Tags applied to the note that shows its helpfulness, applied by raters */
        noteHelpfulTags: BirdwatchHelpfulTag[],
        /** Tags applied to the note that shows its unhelpfulness, applied by raters */
        noteUnhelpfulTags: BirdwatchUnhelpfulTag[]
    },
    text: string,
    tweetId: string
}

/**
 * All notes on a tweet, both ones in support of showing under the tweet, and ones arguing that a note isn't needed
 */
export interface BirdwatchNotesOnTweet {
    /** `true` if you can write a note on this tweet */
    canWriteNote: boolean,
    /** Proposed Birdwatch notes */
    pendingNotes: BirdwatchNote[],
    /** "No note needed" notes */
    notNeededNotes: BirdwatchNote[]
}



/**
 * A single Birdwatch contributor
 */
export interface BirdwatchUser extends Type<'BirdwatchUser'> {
    alias: string,
    /** `true` if the user is an AI model */
    isAi: boolean,
    /** Note ratings submitted by this user */
    ratings: {
        /** Amount of rated notes that helped the note reach a non-pending status */
        successful: HelpfulnessCount,
        /** Amount of rated notes that went against the final reached status */
        unsuccessful: HelpfulnessCount,
        /** Amount of rated notes that are awaiting more ratings */
        pendingCount: number,
        updatedAt: string
    },
    /** Notes submitted by this user */
    notes: HelpfulnessCount & {
        /** Amount of notes that are awaiting more ratings */
        pendingCount: number,
        updatedAt: string
    }
}

interface HelpfulnessCount {
    helpfulCount: number,
    unhelpfulCount: number
}



/**
 * Status of a Birdwatch note
 * 
 * @enum
 */
export const BirdwatchNoteStatus = {
    /** Note is rated helpful, and is currently shown on at least one tweet */
    RatedHelpful: 'RatedHelpful',
    /** Note is rated unhelpful */
    RatedUnhelpful: 'RatedUnhelpful',
    /** Note hasn't received enough, or has received conflicting user ratings to definitively say if it's helpful or not */
    Unrated: 'Unrated'
} as const;
export type BirdwatchNoteStatus = Enum<typeof BirdwatchNoteStatus>;

/**
 * Tags showing why a Birdwatch note is helpful
 * 
 * @enum
 */
export const BirdwatchHelpfulTag = {
    /** Note cites high quality sources */
    GoodSources: 'GoodSources',
    /** Note is easy to understand */
    Clear: 'Clear',
    /** Note directly addresses the tweet's claim */
    AddressesClaim: 'AddressesClaim',
    /** Note provides important context */
    ImportantContext: 'ImportantContext',
    /** Note has unbiased language */
    UnbiasedLanguage: 'UnbiasedLanguage',
    Other: 'Other'
} as const;
export type BirdwatchHelpfulTag = Enum<typeof BirdwatchHelpfulTag>;

/**
 * Tags showing why a Birdwatch note isn't helpful
 * 
 * @enum
 */
export const BirdwatchUnhelpfulTag = {
    /** Note cites no sources, or they're unrealiable */
    NoSources: 'NoSources',
    /** Note cites sources, but they don't support the note */
    IrrelevantSources: 'IrrelevantSources',
    /** Note contains factually incorrect information */
    Incorrect: 'Incorrect',
    /** Note expresses an opinion */
    OpinionSpeculation: 'OpinionSpeculation',
    /** Note contains unclear language or typos */
    Unclear: 'Unclear',
    /** Note misses key points of, or is irrelevant to the tweet */
    MissingKeyPoints: 'MissingKeyPoints',
    /** Note has biased language */
    Rude: 'Rude',
    /** Note not needed on this tweet */
    NoteNotNeeded: 'NoteNotNeeded',
    /** Note is abusive */
    TwitterViolationAny: 'TwitterViolationAny',
    Other: 'Other'
} as const;
export type BirdwatchUnhelpfulTag = Enum<typeof BirdwatchUnhelpfulTag>;

/**
 * Applied to a tweet by a Birdwatch note that wants to be displayed under the tweet
 * 
 * @enum
 */
export const BirdwatchTweetMisleadingTag = {
    /** Tweet contains factually incorrect information */
    FactualError: 'FactualError',
    /** Tweet misinterprets satire and spreads it as if it were fact */
    MisinterpretedSatire: 'MisinterpretedSatire',
    /** Tweet is missing context important to its claim */
    MissingImportantContext: 'MissingImportantContext',
    /** Tweet contains manipulated or AI-generated media */
    ManipulatedMedia: 'ManipulatedMedia',
    /** Tweet contains outdated information */
    OutdatedInformation: 'OutdatedInformation',
    /** Tweet spreads a disputed claim as a fact */
    DisputedClaimAsFact: 'DisputedClaimAsFact',
    Other: 'Other'
} as const;
export type BirdwatchTweetMisleadingTag = Enum<typeof BirdwatchTweetMisleadingTag>;

/**
 * Applied to a tweet by a Birdwatch note that wants no other notes displayed under the tweet, since it doesn't need one
 * 
 * @enum
 */
export const BirdwatchTweetNotMisleadingTag = {
    /** Tweet is correct */
    FactuallyCorrect: 'FactuallyCorrect',
    /** Tweet's content is clearly satire */
    ClearlySatire: 'ClearlySatire',
    /** Tweet expresses an opinion */
    Opinion: 'Opinion',
    Other: 'Other'
} as const;
export type BirdwatchTweetNotMisleadingTag = Enum<typeof BirdwatchTweetNotMisleadingTag>;
