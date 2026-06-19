import { match } from '../../utils/index.js';
import { type Slice, type UserKind, type User, type FanAccountKind, type AboutUser, VerificationKind } from '../index.js';
import * as p from '../parsers.js';

export function user(value: any): UserKind {
    if (!value) {
        return { __typename: 'UnavailableUser' };
    }

    if (value.__typename === 'User') {
        const verified = !!value.verification?.verified || !!value.is_blue_verified;
        const verified_type = value.verification?.verified_type;

        const verificationKind: VerificationKind = match(value.verification?.verified_type, [
            ['Government', VerificationKind.Government],
            ['Business', VerificationKind.Business],
            [[], VerificationKind.Unverified, !verified_type && !verified],
            [[], VerificationKind.Blue, verified],
        ], VerificationKind.Unverified);

        return {
            __typename: 'User',
            id: BigInt(value.rest_id),
            affiliatesCount: value.business_account?.affiliates_count || 0,
            affiliateLabel: !!value.affiliates_highlighted_label?.label?.badge?.url && value.affiliates_highlighted_label.label.userLabelType !== 'AutomatedLabel' ? {
                title: value.affiliates_highlighted_label.label.description,
                owner: value.affiliates_highlighted_label.label.url.url.split('.com/', 2)[1],
                imageUrl: value.affiliates_highlighted_label.label.badge.url
            } : undefined,
            avatarUrl: value.avatar.image_url.replace('normal', '400x400'),
            bannerUrl: value.legacy.profile_banner_url,
            birthday: value.legacy_extended_profile?.birthdate ? {
                day: value.legacy_extended_profile.birthdate.day,
                month: value.legacy_extended_profile.birthdate.month,
                year: value.legacy_extended_profile.birthdate.year
            } : undefined,
            blocked: !!value.legacy.blocking,
            blockedBy: !!value.legacy.blocked_by,
            canDm: !!value.dm_permissions.can_dm,
            canMediaTag: !!value.media_permissions.can_media_tag,
            canSuperFollow: !!value.super_follow_eligible,
            createdAt: new Date(value.core.created_at).toISOString(),
            description: ((value.profile_bio?.description ?? value.legacy.description ?? '') as string).replace(
                /\bhttps:\/\/t\.co\/[a-zA-Z0-9]+/,
                sub => value.legacy.entities.description?.urls?.find((x: any) => x.url === sub)?.expanded_url.replace(/\/$/, '') || sub
            ),
            fanAccountKind: !value.parody_commentary_fan_label || value.parody_commentary_fan_label === 'None' ? undefined : value.parody_commentary_fan_label as FanAccountKind,
            followersCount: value.legacy.followers_count,
            followingCount: value.legacy.friends_count,
            followed: !!value.relationship_perspectives.following,
            followRequested: !!value.legacy.follow_request_sent,
            followedBy: !!value.relationship_perspectives.followed_by,
            isAutomated: value.affiliates_highlighted_label?.label?.userLabelType === 'AutomatedLabel',
            isTranslatable: !!value.is_profile_translatable,
            job: value.professional?.category?.at(0)?.name,
            location: !!value.location.location ? value.location.location : undefined,
            muted: !!value.relationship_perspectives.muting,
            name: value.core.name,
            pinnedTweetId: value.legacy.pinned_tweet_ids_str.length > 0
                ? BigInt(value.legacy.pinned_tweet_ids_str[0])
                : undefined,
            protected: !!value.privacy.protected,
            superFollowingCount: value.creator_subscriptions_count || 0,
            superFollowingHidden: !!value.has_hidden_subscriptions_on_profile,
            tweetsCount: value.legacy.statuses_count,
            mediaCount: value.legacy.media_count,
            likesCount: value.legacy.favourites_count,
            listedCount: value.legacy.listed_count,
            highlightedTweetsCount: Number(value.highlights_info?.highlighted_tweets || '0'),
            username: value.core.screen_name,
            url: value.legacy.entities.url?.urls?.at?.(0)?.expanded_url?.replace(/^http:\/\//, 'https://')?.replace(/\/$/, ''),
            verification: {
                kind: verificationKind,
                isVerified: verified,
                verifiedSince: verified
                    ? new Date(Number(value.verification_info?.reason?.verified_since_msec || '0')).toISOString()
                    : undefined,
                verifiedWithId: !!value.verification_info?.is_identity_verified
            },
            wantRetweets: !!value.legacy.want_retweets,
            wantNotifications: !!value.legacy.notifications
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
        id: BigInt(value.id_str),
        affiliatesCount: 0,
        avatarUrl: value.profile_image_url_https.replace('normal', '400x400'),
        bannerUrl: value.profile_banner_url || undefined,
        blocked: !!value.blocking,
        blockedBy: !!value.blocked_by,
        canDm: !!value.can_dm,
        canMediaTag: !!value.can_media_tag,
        canSuperFollow: false,
        createdAt: new Date(value.created_at).toISOString(),
        description: value.description || '',
        followersCount: value.followers_count || 0,
        followingCount: value.friends_count || 0,
        followed: !!value.following,
        followRequested: !!value.follow_request_sent,
        followedBy: !!value.followed_by,
        isAutomated: false,
        isTranslatable: false,
        location: value.location || undefined,
        muted: !!value.muting,
        name: value.name,
        protected: !!value.protected,
        superFollowingCount: 0,
        superFollowingHidden: false,
        tweetsCount: value.statuses_count || 0,
        mediaCount: value.media_count || 0,
        likesCount: value.favorite_count || 0,
        listedCount: value.listed_count || 0,
        highlightedTweetsCount: 0,
        username: value.screen_name,
        url: undefined,
        verification: {
            kind: !!value.ext_is_blue_verified ? 'Blue' : 'Unverified',
            isVerified: !!value.ext_is_blue_verified,
            verifiedWithId: false
        },
        wantRetweets: !!value.want_retweets,
        wantNotifications: !!value.notification
    }
}

export function aboutUser(value: any): AboutUser {
    return {
        __typename: 'AboutUser',
        id: BigInt(value.rest_id),
        avatarUrl: value.avatar.image_url.replace('normal', '400x400'),
        basedIn: value.about_profile?.account_based_in,
        createdAt: new Date(value.core.created_at).toISOString(),
        name: value.core.name,
        protected: !!value.privacy?.protected,
        verification: {
            verified: !!value.is_blue_verified,
            verifiedSince: !!value.verification_info?.reason?.verified_since_msec
                ? new Date(Number(value.verification_info.reason.verified_since_msec)).toISOString()
                : undefined,
            verifiedWithId: !!value.verification_info?.is_identity_verified
        },
        vpn: !!value.about_profile?.location_accurate,
        usernames: {
            changedCount: Number(value.username_changes?.count || '0'),
            current: value.core.screen_name,
            updatedAt: !!value.username_changes?.last_changed_at
                ? new Date(Number(value.username_changes.last_changed_at)).toISOString()
                : undefined
        }
    };
}



export function userEntries(instructions: any): Slice<UserKind> {
    const value: any[] = p.getEntries(instructions);

    const entries = value.map(entry => ({
        id: entry.entryId,
        content: entry.content.__typename === 'TimelineTimelineCursor'
            ? p.cursor(entry.content)
            : user(entry.content.itemContent.user_results?.result)
    }));

    return {
        entries,
        cursors: p.cursorsOf(entries)
    };
}
