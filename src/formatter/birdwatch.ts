import type { BirdwatchNote, BirdwatchNotesOnTweet, BirdwatchUser } from '../types/birdwatch.js';
import { BirdwatchTweetMisleadingTag as MisleadingTag, BirdwatchTweetNotMisleadingTag as NotMisleadingTag, BirdwatchNoteStatus, BirdwatchHelpfulTag as HelpfulTag, BirdwatchUnhelpfulTag as UnhelpfulTag } from '../types/birdwatch.js';

export function birdwatchUser(value: any, is_ai?: boolean): BirdwatchUser {
    return {
        alias: value.alias,
        is_ai: !!is_ai || !!value.is_api_contributor,
        ratings: {
            successful: {
                helpful_count: value.ratings_count?.successful?.helpful_count || 0,
                unhelpful_count: value.ratings_count?.successful?.not_helpful_count || 0
            },
            unsuccessful: {
                helpful_count: value.ratings_count?.unsuccessful?.helpful_count || 0,
                unhelpful_count: value.ratings_count?.unsuccessful?.not_helpful_count || 0
            },
            pending_count: value.ratings_count?.awaiting_more_ratings || 0,
            updated_at: new Date(value.ratings_count?.last_updated_at).toISOString()
        },
        notes: {
            helpful_count: value.notes_count?.currently_rated_helpful || 0,
            unhelpful_count: value.notes_count?.currently_rated_not_helpful || 0,
            pending_count: value.notes_count?.awaiting_more_ratings,
            updated_at: new Date(value.notes_count?.last_updated_at).toISOString()
        }
    };
}



export function birdwatchNote(value: any): BirdwatchNote {
    return {
        __typename: 'BirdwatchNote',
        id: value.rest_id,
        ai_generated: !!value.is_api_author,
        author: birdwatchUser(value.birdwatch_profile, !!value.is_api_author),
        by_media: !!value.is_media_note,
        by_url: !!value.is_url_note,
        created_at: new Date(value.created_at).toISOString(),
        has_trustworthy_sources: !!value.data_v1.trustworthy_sources,
        lang: value.language || 'en',
        media_matches_count: value.media_note_matches_v2?.match_count || Number(value.media_note_matches) || 0,
        status: value.rating_status === 'CurrentlyRatedHelpful'
            ? BirdwatchNoteStatus.Helpful
        : value.rating_status === 'CurrentlyRatedNotHelpful'
            ? BirdwatchNoteStatus.Unhelpful
            : BirdwatchNoteStatus.Unrated,
        tags: {
            ...(value.classification !== 'NotMisleading' ? {
                __typename: 'MisleadingTweet',
                tweet_misleading_tags: (value.data_v1.misleading_tags || [])
                    .map((s: string) => s in MisleadingTag ? MisleadingTag[s as keyof typeof MisleadingTag] : MisleadingTag.Other)
            } : {
                __typename: 'NoNoteNeeded',
                tweet_not_misleading_tags: (value.data_v1.not_misleading_tags || [])
                    .map((s: string) => s in NotMisleadingTag ? NotMisleadingTag[s as keyof typeof NotMisleadingTag] : NotMisleadingTag.Other)
            }),
            note_helpful_tags: (value.helpful_tags || [])
                .map((s: string) => s in HelpfulTag ? HelpfulTag[s as keyof typeof HelpfulTag] : HelpfulTag.Other),
            note_unhelpful_tags: (value.not_helpful_tags || [])
                .map((s: string) => s in UnhelpfulTag ? UnhelpfulTag[s as keyof typeof UnhelpfulTag] : UnhelpfulTag.Other)
        },
        text: value.data_v1.summary?.text,
        tweet_id: value.tweet_results?.result?.rest_id!
    };
}

export function birdwatchTweet(value: any): BirdwatchNotesOnTweet {
    return {
        can_write_note: !!value.can_user_write_notes_on_post_author,
        pending_notes: (value.misleading_birdwatch_notes?.notes || []).map(birdwatchNote),
        not_needed_notes: (value.not_misleading_birdwatch_notes?.notes || []).map(birdwatchNote)
    }
}
