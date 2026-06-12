import type { Enum, Type } from '../internal.js';

/**
 * User
 */
export interface User extends Type<'User'> {
    id: string,
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
    /** `true` if you've blocked this user */
    blocked: boolean,
    /** `true` if user has blocked you */
    blockedBy: boolean,
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
    /** `true` if you're following this user */
    followed: boolean,
    /** `true` if you've requested to follow this user */
    followRequested: boolean,
    /** `true` if this user follows you */
    followedBy: boolean,
    /** `true` if this user is marked as an automated account */
    isAutomated: boolean,
    isTranslatable: boolean,
    job?: string,
    location?: string,
    /** `true` if you've muted this user */
    muted: boolean,
    name: string,
    /** `id` of the user's pinned tweet, `undefined` if it doesn't exist */
    pinnedTweetId?: string,
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

/**
 * Fan account status
 * 
 * @enum
 */
export const FanAccountKind = {
    Fan: 'Fan',
    Parody: 'Parody'
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

/**
 * User that doesn't exist, such as a user that has been suspended deactivated or a username that isn't taken
 */
export interface UnavailableUser extends Type<'UnavailableUser' | 'SuspendedUser'> {}

export type UserKind = User | UnavailableUser;



/**
 * Additional information about a user
 */
export interface AboutUser extends Type<'AboutUser'> {
    id: string,
    /** URL for the user's profile picture */
    avatarUrl: string,
    /** Country the user is based in */
    basedIn?: string,
    createdAt: string,
    name: string,
    /** `true` if the user's tweets can only be viewed by users that follow them */
    protected: boolean,
    verification: {
        verified: boolean,
        verifiedSince?: string,
        verifiedWithId: boolean
    },
    /** `true` if the user is using a VPN */
    vpn: boolean,
    usernames: {
        /** Total times this user's username was changed */
        changedCount: number,
        current: string,
        updatedAt?: string
    }
}
