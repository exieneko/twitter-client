/**
 * Represents a single Birdwatch note
 */
export interface BirdwatchNote {
    __typename: 'BirdwatchNote',
    id: string,
    /** Whether or not the note was created by an ai author */
    ai_generated: boolean,
    author: BirdwatchUser,
    /** Whether or not the note is added due to an image or video contained in the tweet */
    by_media: boolean,
    /** Whether or not the note is added due to a url contained in the tweet */
    by_url: boolean,
    /** The note's creation datetime as an ISO string */
    created_at: string,
    /** Whether or not the note has sources cited */
    has_trustworthy_sources: boolean,
    lang: string,
    /**
     * Amount of tweets with matching media that will also be Birdwatch noted\
     * Will be `0` if the note isn't a media note
     */
    media_matches_count: number,
    /** The note's current display status */
    status: BirdwatchNoteStatus,
    tags: ({
        __typename: 'MisleadingTweet',
        /** The note's claims of why the tweet needs a Birdwatch note */
        tweet_misleading_tags: BirdwatchTweetMisleadingTag[]
    } | {
        __typename: 'NoNoteNeeded',
        /** The note's claims of why no notes are needed on this tweet */
        tweet_not_misleading_tags: BirdwatchTweetNotMisleadingTag[]
    }) & {
        /** Tags applied to the note that shows its helpfulness, applied by raters */
        note_helpful_tags: BirdwatchHelpfulTag[],
        /** Tags applied to the note that shows its unhelpfulness, applied by raters */
        note_unhelpful_tags: BirdwatchUnhelpfulTag[]
    },
    /** All text contained in the note */
    text: string,
    tweet_id: string
}

/**
 * Represents all notes on a tweet, both ones in support of showing under the tweet, and ones arguing that a note isn't needed
 */
export interface BirdwatchNotesOnTweet {
    can_write_note: boolean,
    pending_notes: BirdwatchNote[],
    not_needed_notes: BirdwatchNote[]
}



/**
 * Represents a single Birdwatch user
 */
export interface BirdwatchUser {
    /** The user's fake "username" to differentiate them from their Twitter user profile */
    alias: string,
    is_ai: boolean,
    ratings: {
        successful: HelpfulnessCount,
        unsuccessful: HelpfulnessCount,
        pending_count: number,
        updated_at: string
    },
    notes: HelpfulnessCount & {
        pending_count: number,
        updated_at: string
    }
}

interface HelpfulnessCount {
    helpful_count: number,
    unhelpful_count: number
}



/**
 * Status of a Birdwatch note
 */
export type BirdwatchNoteStatus = 'RatedHelpful' | 'RatedUnhelpful' | 'Unrated';

/**
 * Tags showing why a Birdwatch note is helpful
 */
export type BirdwatchHelpfulTag = 'GoodSources' | 'Clear' | 'AddressesClaim' | 'ImportantContext' | 'UnbiasedLanguage' | 'Other';

/**
 * Tags showing why a Birdwatch note isn't helpful
 */
export type BirdwatchUnhelpfulTag = 'NoSources' | 'IrrelevantSources' | 'Incorrect' | 'OpinionSpeculation' | 'Unclear' | 'MissingKeyPoints' | 'Rude' | 'TwitterViolationAny' | 'Other';

/**
 * Applied to a tweet by a Birdwatch note that wants to be displayed under the tweet
 */
export type BirdwatchTweetMisleadingTag = 'FactualError' | 'MisinterpretedSatire' | 'MissingImportantContext' | 'ManipulatedMedia' | 'OutdatedInformation' | 'DisputedClaimAsFact' | 'Other';

/**
 * Applied to a tweet by a Birdwatch note that wants no other notes displayed under the tweet, since it doesn't need one
 */
export type BirdwatchTweetNotMisleadingTag = 'FactuallyCorrect' | 'ClearlySatire' | 'Opinion' | 'Other';
