import { match } from '../../utils/index.js';
import { BirdwatchNoteStatus, type BirdwatchNote, type BirdwatchNotesOnTweet, type BirdwatchUser, type Slice, type TweetKind } from '../index.js';
import * as p from '../parsers.js';

export function birdwatchUser(value: any, isAi: boolean): BirdwatchUser {
    return {
        __typename: 'BirdwatchUser',
        alias: value.alias,
        isAi: !!value.is_api_contributor || isAi,
        ratings: {
            successful: {
                helpfulCount: value.ratings_count?.successful?.helpful_count || 0,
                unhelpfulCount: value.ratings_count?.successful?.not_helpful_count || 0
            },
            unsuccessful: {
                helpfulCount: value.ratings_count?.unsuccessful?.helpful_count || 0,
                unhelpfulCount: value.ratings_count?.unsuccessful?.not_helpful_count || 0
            },
            pendingCount: value.ratings_count?.awaiting_more_ratings || 0,
            updatedAt: new Date(value.ratings_count?.last_updated_at).toISOString()
        },
        notes: {
            helpfulCount: value.notes_count?.currently_rated_helpful || 0,
            unhelpfulCount: value.notes_count?.currently_rated_not_helpful || 0,
            pendingCount: value.notes_count?.awaiting_more_ratings,
            updatedAt: new Date(value.notes_count?.last_updated_at).toISOString()
        }
    };
}



export function birdwatchNote(value: any): BirdwatchNote {
    return {
        __typename: 'BirdwatchNote',
        id: BigInt(value.rest_id),
        author: birdwatchUser(value.birdwatch_profile, !!value.is_api_author),
        byMedia: !!value.is_media_note,
        byUrl: !!value.is_url_note,
        createdAt: new Date(value.created_at).toISOString(),
        hasTrustworthySources: !!value.data_v1.trustworthy_sources,
        lang: value.language || 'en',
        mediaMatchesCount: value.media_note_matches_v2?.match_count || Number(value.media_note_matches) || 0,
        status: match(value.rating_status, [
            ['CurrentlyRatedHelpful', BirdwatchNoteStatus.RatedHelpful],
            ['CurrentlyRatedNotHelpful', BirdwatchNoteStatus.RatedUnhelpful],
        ], BirdwatchNoteStatus.Unrated),
        tags: {
            ...(value.classification !== 'NotMisleading' ? {
                __typename: 'MisleadingTweet',
                tweetMisleadingTags: value.data_v1.misleading_tags || []
            } : {
                __typename: 'NoNoteNeeded',
                tweetNotMisleadingTags: value.data_v1.not_misleading_tags || []
            }),
            noteHelpfulTags: value.helpful_tags || [],
            noteUnhelpfulTags: value.not_helpful_tags || []
        },
        text: value.data_v1.summary?.text,
        tweetId: value.tweet_results?.result?.rest_id!
    };
}

export function birdwatchTweet(value: any): BirdwatchNotesOnTweet {
    return {
        canWriteNote: !!value.can_user_write_notes_on_post_author,
        pendingNotes: (value.misleading_birdwatch_notes?.notes || []).map(birdwatchNote),
        notNeededNotes: (value.not_misleading_birdwatch_notes?.notes || []).map(birdwatchNote)
    }
}



export function birdwatch(body: any): Slice<TweetKind> {
    const entries = p.getEntries(body.initialTimeline.timeline.timeline.instructions).map(p.entry).filter(x => !!x);

    return {
        name: body.initialTimeline.id,
        segments: body.timelines.map((timeline: any) => ({
            id: timeline.timeline.id,
            name: timeline.id
        })) || [],
        entries,
        cursors: p.cursorsOf(entries)
    };
}
