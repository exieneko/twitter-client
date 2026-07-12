import type { Default, Enum, MaybeType, Model, Type, Wrapped } from './internal/index.js';
import { assert, match } from '../utils/index.js';

/**
 * User
 */
export interface User extends Type<'User'> {
    id: bigint,
    /** Amount of affiliates the user has */
    affiliatesCount: number,
    /** User's affiliate label if they're associated with a business account */
    affiliateLabel?: {
        title: string,
        /** Username of the business account */
        owner: string,
        imageUrl: string
    },
    avatarUrl: string,
    bannerUrl?: string,
    /** The user's birthday as an object */
    birthday?: {
        day: number,
        month: number,
        year?: number
    },
    /** `true` if you can send a direct message to the user */
    canDm: boolean,
    /** `true` if you can credit a user in a media tweet by tagging them directly in the attachment */
    canMediaTag: boolean,
    /** `true` if the user allows others to super-follow them */
    canSuperFollow: boolean,
    createdAt: string,
    description: string,
    /** Fan status of an account */
    fanAccountKind?: FanAccountKind,
    /** Amount of followers the user has */
    followersCount: number,
    /** Amount of users the user is following */
    followingCount: number,
    /** `true` if this user follows you */
    isFollowedBy: boolean,
    /** `true` if this user is marked as an automated account */
    isAutomated: boolean,
    /** `true` if you've blocked this user */
    isBlocked: boolean,
    /** `true` if user has blocked you */
    isBlockedBy: boolean,
    /** `true` if you're following this user */
    isFollowed: boolean,
    /** `true` if you've requested to follow this user */
    isFollowRequested: boolean,
    /** `true` if you've muted this user */
    isMuted: boolean,
    isTranslatable: boolean,
    job?: string,
    location?: string,
    name: string,
    /** `id` of the user's pinned tweet, `undefined` if it doesn't exist */
    pinnedTweetId?: bigint,
    /** `true` if the user's tweets can only be viewed by users that follow them */
    protected: boolean,
    /** Amount of other users the user is super-following */
    superFollowingCount: number,
    /** `true` if user's user-following is hidden */
    superFollowingHidden: boolean,
    /** Amount of total tweets the user created */
    tweetsCount: number,
    /** Amount of tweets the user created that contain media */
    mediaCount: number,
    /** Amount of tweets the user has liked */
    likesCount: number,
    /** Amount of lists the user is on */
    listedCount: number,
    /** Amount of their tweets the user has highlighted */
    highlightedTweetsCount: number,
    username: string,
    /** The full url on the user's profile, `undefined` if empty */
    url?: string,
    verification: {
        /** Shows the kind of verification the user has */
        kind: VerificationKind,
        /** `true` if the user has a verification chechmark */
        isVerified: boolean,
        /** When the user was initially verified */
        verifiedSince?: string,
        /** `true` if the user successfully verified their identity with a legal id */
        verifiedWithId: boolean
    },
    /** `true` if retweets of the user should be included in your timelines */
    wantRetweets: boolean,
    /** `true` if tweets of the user should give you notifications */
    wantNotifications: boolean
}
export const User: Wrapped<UserKind, Model<User, null, { legacy: boolean }>> = {
    async new(_, value, opts) {
        if (opts.legacy) {
            return {
                __typename: 'User',
                id: BigInt(value.id_str),
                affiliatesCount: 0,
                avatarUrl: value.profile_image_url_https.replace('normal', '400x400'),
                bannerUrl: value.profile_banner_url || undefined,
                canDm: !!value.can_dm,
                canMediaTag: !!value.can_media_tag,
                canSuperFollow: false,
                createdAt: new Date(value.created_at).toISOString(),
                description: value.description || '',
                followersCount: value.followers_count || 0,
                followingCount: value.friends_count || 0,
                isAutomated: false,
                isBlocked: !!value.blocking,
                isBlockedBy: !!value.blocked_by,
                isFollowed: !!value.following,
                isFollowRequested: !!value.follow_request_sent,
                isFollowedBy: !!value.followed_by,
                isMuted: !!value.muting,
                isTranslatable: false,
                location: value.location || undefined,
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
                verification: {
                    kind: !!value.ext_is_blue_verified ? VerificationKind.Blue : VerificationKind.Unverified,
                    isVerified: !!value.ext_is_blue_verified,
                    verifiedWithId: false
                },
                wantRetweets: !!value.want_retweets,
                wantNotifications: !!value.notification
            };
        }

        const verified = !!value.verification?.verified || !!value.is_blue_verified;
        const verifiedType = value.verification?.verified_type;

        const verificationKind: VerificationKind = match(value.verification?.verified_type, [
            ['Government', VerificationKind.Government],
            ['Business', VerificationKind.Business],
            [[], VerificationKind.Unverified, !verifiedType && !verified],
            [[], VerificationKind.Blue, verified]
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
            isAutomated: value.affiliates_highlighted_label?.label?.userLabelType === 'AutomatedLabel',
            isBlocked: !!value.legacy.blocking,
            isBlockedBy: !!value.legacy.blocked_by,
            isFollowed: !!value.relationship_perspectives.following,
            isFollowRequested: !!value.legacy.follow_request_sent,
            isFollowedBy: !!value.relationship_perspectives.followed_by,
            isTranslatable: !!value.is_profile_translatable,
            job: value.professional?.category?.at(0)?.name,
            location: !!value.location.location ? value.location.location : undefined,
            isMuted: !!value.relationship_perspectives.muting,
            name: value.core.name,
            pinnedTweetId: value.legacy.pinned_tweet_ids_str.at(0),
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
                    ? new Date(Number(value.verification_info?.reason?.verified_since_msecs || 0)).toISOString()
                    : undefined,
                verifiedWithId: !!value.verification_info?.is_identity_verified
            },
            wantRetweets: !!value.legacy.want_retweets,
            wantNotifications: !!value.legacy.notifications
        };
    },
    assert(value) {
        return assert(value, 'User');
    }
};

/**
 * User that doesn't exist, such as a user that has been suspended deactivated or a username that isn't taken
 */
export interface UnavailableUser extends Type<'UnavailableUser'> {
    isSuspended: boolean
}
export const UnavailableUser: Wrapped<UserKind, Model<UnavailableUser, string | undefined>> & Default<UnavailableUser> = {
    async new(_, value) {
        return {
            __typename: 'UnavailableUser',
            isSuspended: value === 'UnavailableUser'
        };
    },
    assert(value) {
        return assert(value, 'UnavailableUser');
    },
    default() {
        return {
            __typename: 'UnavailableUser',
            isSuspended: false
        };
    }
};

export type UserKind = User | UnavailableUser;
export const UserKind: Model<UserKind, MaybeType, { legacy: boolean }> & Default<UserKind> = {
    async new(fmt, value, opts) {
        if (!value) {
            return await fmt.next(UnavailableUser, undefined);
        }

        if (value.__typename !== 'User') {
            return await fmt.next(UnavailableUser, value.__typename);
        }

        return await fmt.next(User, value, opts);
    },
    default() {
        return UnavailableUser.default();
    }
};



/**
 * Additional information about a user
 */
export interface AboutUser extends Type<'AboutUser'> {
    id: bigint,
    /** URL for the user's profile picture */
    avatarUrl: string,
    /** Country the user is based in */
    basedIn?: string,
    createdAt: string,
    name: string,
    /** `true` if the user's tweets can only be viewed by users that follow them */
    protected: boolean,
    verification: User['verification'],
    /** `true` if the user is using a VPN */
    vpn: boolean,
    usernames: {
        /** Total times this user's username was changed */
        changedCount: number,
        current: string,
        updatedAt?: string
    }
}
export const AboutUser: Model<AboutUser> = {
    async new(_, value) {
        return {
            __typename: 'AboutUser',
            id: BigInt(value.rest_id),
            avatarUrl: value.avatar.image_url.replace('normal', '400x400'),
            basedIn: value.about_profile?.account_based_in,
            createdAt: new Date(value.core.created_at).toISOString(),
            name: value.core.name,
            protected: !!value.privacy?.protected,
            verification: {
                kind: !!value.is_blue_verified ? VerificationKind.Blue : VerificationKind.Unverified,
                isVerified: !!value.is_blue_verified,
                verifiedSince: !!value.verification_info?.reason?.verified_since_msec
                    ? new Date(Number(value.verification_info.reason.verified_since_msec)).toISOString()
                    : undefined,
                verifiedWithId: !!value.verification_info?.is_identity_verified
            },
            vpn: !!value.about_profile?.location_accurate,
            usernames: {
                changedCount: Number(value.username_changes?.count || 0),
                current: value.core.screen_name,
                updatedAt: !!value.username_changes?.last_changed_at
                    ? new Date(Number(value.username_changes.last_changed_at)).toISOString()
                    : undefined
            }
        };
    },
};



/**
 * Fan account status
 * 
 * @enum
 */
export const FanAccountKind = {
    Fan: 'Fan',
    Parody: 'Parody',
    Commentary: 'Commentary'
} as const;
export type FanAccountKind = Enum<typeof FanAccountKind>;

/**
 * Verification status of a user
 * 
 * @enum
 */
export const VerificationKind = {
    /**
     * No verification
     * 
     * @default
     */
    Unverified: 'Unverified',
    /** Blue checkmark for Twitter Blue subscribers, legacy verified accounts, or business account affiliates */
    Blue: 'Blue',
    /** Gold checkmark for business accounts */
    Business: 'Business',
    /** Gray checkmark for official government accounts */
    Government: 'Government'
} as const;
export type VerificationKind = Enum<typeof VerificationKind>;
