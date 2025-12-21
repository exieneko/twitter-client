import { Entry, SuspendedUser, TimelineUser, UnavailableUser, User, VerificationKind } from '../types/index.js';
import { cursor, getEntries } from './index.js';

export function user(value: any): User | SuspendedUser | UnavailableUser {
    if (!value) {
        return { __typename: 'UnavailableUser' };
    }

    if (value.__typename === 'User') {
        const verified = !!value.verification?.verified || !!value.is_blue_verified;
        const verified_type = value.verification?.verified_type;

        return {
            __typename: 'User',
            id: value.rest_id,
            affiliates_count: value.business_account?.affiliates_count || 0,
            affiliate_label: !!value.affiliates_highlighted_label?.label?.badge?.url ? {
                title: value.affiliates_highlighted_label.label.description,
                owner: value.affiliates_highlighted_label.label.url.url.split('.com/', 1)[1],
                image_url: value.affiliates_highlighted_label.label.badge.url
            } : undefined,
            avatar_url: value.avatar.image_url.replace('normal', '400x400'),
            banner_url: value.legacy.profile_banner_url,
            birthday: value.legacy_extended_profile?.birthdate ? {
                day: value.legacy_extended_profile.birthdate.day,
                month: value.legacy_extended_profile.birthdate.month,
                year: value.legacy_extended_profile.birthdate.year
            } : undefined,
            blocked: !!value.legacy.blocking,
            blocked_by: !!value.legacy.blocked_by,
            can_dm: !!value.dm_permissions.can_dm,
            can_media_tag: !!value.media_permissions.can_media_tag,
            can_super_follow: !!value.super_follow_eligible,
            created_at: new Date(value.core.created_at).toISOString(),
            description: (value.legacy.description as string).replace(
                /\bhttps:\/\/t\.co\/[a-zA-Z0-9]+/,
                sub => value.legacy.entities.description?.urls?.find((x: any) => x.url === sub)?.expanded_url.replace(/\/$/, '') || sub
            ),
            followers_count: value.legacy.followers_count,
            following_count: value.legacy.friends_count,
            followed: !!value.relationship_perspectives.following,
            follow_requested: !!value.legacy.follow_request_sent,
            followed_by: !!value.relationship_perspectives.followed_by,
            job: value.professional?.category?.at(0)?.name,
            location: !!value.location.location ? value.location.location : undefined,
            muted: !!value.relationship_perspectives.muting,
            name: value.core.name,
            pinned_tweet_id: value.legacy.pinned_tweet_ids_str.at(0),
            protected: !!value.privacy.protected,
            super_following_count: value.creator_subscriptions_count || 0,
            super_following_hidden: !!value.has_hidden_subscriptions_on_profile,
            translatable: !!value.is_profile_translatable,
            tweets_count: value.legacy.statuses_count,
            media_count: value.legacy.media_count,
            likes_count: value.legacy.favourites_count,
            listed_count: value.legacy.listed_count,
            username: value.core.screen_name,
            url: value.legacy.entities.url?.urls?.at(0)?.expanded_url?.replace(/\/$/, ''),
            verified,
            verification_kind: verified_type === 'Government'
                ? VerificationKind.Government
            : verified_type === 'Business'
                ? VerificationKind.Business
            : !verified_type && !verified
                ? VerificationKind.Unverified
            : verified
                ? VerificationKind.Blue
                : VerificationKind.Unverified,
            want_retweets: !!value.legacy.want_retweets,
            want_notifications: !!value.legacy.notifications
        };
    }

    if (value.__typename === 'UnavailableUser') {
        return { __typename: 'SuspendedUser' };
    }

    return { __typename: 'UnavailableUser' };
}

export function userLegacy(value: any): User {
    return {
        __typename: 'User',
        id: value.id_str,
        affiliates_count: 0,
        avatar_url: value.profile_image_url_https.replace('normal', '400x400'),
        banner_url: value.profile_banner_url || undefined,
        blocked: !!value.blocking,
        blocked_by: !!value.blocked_by,
        can_dm: !!value.can_dm,
        can_media_tag: !!value.can_media_tag,
        can_super_follow: false,
        created_at: new Date(value.created_at).toISOString(),
        description: value.description || '',
        followers_count: value.followers_count || 0,
        following_count: value.friends_count || 0,
        followed: !!value.following,
        follow_requested: !!value.follow_request_sent,
        followed_by: !!value.followed_by,
        location: value.location || undefined,
        muted: !!value.muting,
        name: value.name,
        protected: !!value.protected,
        super_following_count: 0,
        super_following_hidden: false,
        translatable: false,
        tweets_count: value.statuses_count || 0,
        media_count: value.media_count || 0,
        likes_count: value.favorite_count || 0,
        listed_count: value.listed_count || 0,
        username: value.screen_name,
        url: undefined,
        verified: value.ext_is_blue_verified,
        verification_kind: VerificationKind.Blue,
        want_retweets: !!value.want_retweets,
        want_notifications: !!value.notification
    }
}



export function userEntries(instructions: any): Entry<TimelineUser>[] {
    const value: any[] = getEntries(instructions);

    return value.map(entry => ({
        id: entry.entryId,
        content: entry.content.__typename === 'TimelineTimelineCursor'
            ? cursor(entry.content)
            : user(entry.content.itemContent.user_results?.result)
    }));
}
