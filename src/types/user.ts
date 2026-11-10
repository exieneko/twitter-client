import type { Type } from './utils.js';

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
    /** Url of the user's avatar. The default avatar url will be used as a fallback in cases where a user may not have an avatar */
    avatarUrl: string,
    /** Url of the user's banner */
    bannerUrl?: string,
    birthday?: {
        day: number,
        month: number,
        year?: number
    },
    /** Whether the authenticated user can send a direct message to the user */
    canDm: boolean,
    /** Whether the authenticated user can tag the user in media attachments */
    canMediaTag: boolean,
    /** Whether the authenticated user cab super-follow the user (requires the user to have super-follows/subscriptions enabled) */
    canSuperFollow: boolean,
    createdAt: string,
    description: string,
    descriptionTranslation?: {
        text: string,
        /** Destination language */
        language: string
    },
    /**
     * Fan account status of the user
     * 
     * @deprecated use `fanAccountType`
     */
    fanAccountKind?: FanAccountType,
    /** Fan account status of the user */
    fanAccountType?: FanAccountType,
    /** Amount of followers the user has */
    followersCount: number,
    /** Amount of users the user is following */
    followingCount: number,
    /** Whether the user is marked as an automated account */
    isAutomated: boolean,
    isBlocked: boolean,
    isBlockedBy: boolean,
    isFollowed: boolean,
    isFollowRequested: boolean,
    isFollowedBy: boolean,
    isMuted: boolean,
    isSuperFollowed: boolean,
    isSuperFollowedBy: boolean,
    isSuperFollowingHidden: boolean,
    isTranslatable: boolean,
    job?: string,
    location?: string,
    name: string,
    /** Id of the user's pinned tweet, if it exists */
    pinnedTweetId?: string,
    /** Whether the user's tweets can only be viewed by users that follow them */
    protected: boolean,
    /** Amount of other users the user is super-following */
    superFollowingCount: number,
    /** Amount of total tweets the user created */
    tweetsCount: number,
    /** Amount of tweets the user created that contain media */
    mediaCount: number,
    /** Amount of tweets the user has liked */
    likesCount: number,
    /**
     * Amount of lists the user is on
     * 
     * @deprecated the Twitter API no longer reports this, always 0
     */
    listedCount: number,
    /** Amount of their tweets the user has highlighted */
    highlightedTweetsCount: number,
    username: string,
    /** The full url on the user's profile, `undefined` if empty */
    url?: string,
    verification: {
        /**
         * Shows the type of verification the user has
         * 
         * @deprecated use `verification.type`
         * */
        kind?: VerificationType,
        /** Shows the type of verification the user has */
        type: VerificationType,
        /** Whether the user has a verification chechmark */
        isVerified: boolean,
        /** When the user was initially verified */
        verifiedSince?: string,
        /** Whether the user successfully verified their identity with a legal ID */
        verifiedWithId: boolean
    },
    /** Whether retweets of the user should be included in timelines of the authenticated user */
    wantRetweets: boolean,
    /** Whether tweets of the user should give notifications to the authenticated user */
    wantNotifications: boolean
}

export interface UnavailableUser extends Type<'UnavailableUser'> {
    isSuspended: boolean
}

export type UserResult = User | UnavailableUser;

/**
 * Fan account status
 */
export enum FanAccountType {
    Fan = 'Fan',
    Parody = 'Parody',
    Commentary = 'Commentary'
}

/**
 * Verification status of a user
 * 
 * @default VerificationType.Unverified
 */
export enum VerificationType {
    /** No verification */
    Unverified = 'Unverified',
    /** Blue checkmark for Twitter Blue subscribers or some legacy verified accounts */
    Blue = 'Blue',
    /** Blue checkmark received for being an affiliate to a gold checkmark account */
    BlueAffiliate = 'BlueAffiliate',
    /** Gold checkmark for business accounts */
    Business = 'Business',
    /** Gray checkmark for official government accounts */
    Government = 'Government'
}



export interface AboutUser extends Type<'AboutUser'> {
    id: string,
    /** Url of the user's avatar. The default avatar url will be used as a fallback in cases where a user may not have an avatar */
    avatarUrl: string,
    /** Country the user is based in */
    basedIn?: string,
    createdAt: string,
    name: string,
    /** Whether the user's tweets can only be viewed by users that follow them */
    protected: boolean,
    verification: User['verification'],
    /** Whether the user is using a VPN */
    vpn: boolean,
    usernames: {
        changedCount: number,
        current: string,
        updatedAt?: string
    }
}
