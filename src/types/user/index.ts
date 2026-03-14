import type { Enum, Type } from '../internal.js';

/**
 * User
 */
export interface User extends Type<'User'> {
    id: string,
    /** Amount of affiliates the user has */
    affiliates_count: number,
    /** User's affiliate label if they're associated with a business account */
    affiliate_label?: {
        title: string,
        /** Username of the business account */
        owner: string,
        image_url: string
    },
    avatar_url: string,
    banner_url?: string,
    /** The user's birthday as an object */
    birthday?: {
        day: number,
        month: number,
        year?: number
    },
    /** `true` if you've blocked this user */
    blocked: boolean,
    /** `true` if user has blocked you */
    blocked_by: boolean,
    /** `true` if you can send a direct message to the user */
    can_dm: boolean,
    /** `true` if you can credit a user in a media tweet by tagging them directly in the attachment */
    can_media_tag: boolean,
    /** `true` if the user allows others to super-follow them */
    can_super_follow: boolean,
    created_at: string,
    description: string,
    /** Fan status of an account */
    fan_account_kind?: FanAccountKind,
    /** Amount of followers the user has */
    followers_count: number,
    /** Amount of users the user is following */
    following_count: number,
    /** `true` if you're following this user */
    followed: boolean,
    /** `true` if you've requested to follow this user */
    follow_requested: boolean,
    /** `true` if this user follows you */
    followed_by: boolean,
    /** `true` if this user is marked as an automated account */
    is_automated: boolean,
    is_translatable: boolean,
    job?: string,
    location?: string,
    /** `true` if you've muted this user */
    muted: boolean,
    name: string,
    /** `id` of the user's pinned tweet, `undefined` if it doesn't exist */
    pinned_tweet_id?: string,
    /** `true` if the user's tweets can only be viewed by users that follow them */
    protected: boolean,
    /** Amount of other users the user is super-following */
    super_following_count: number,
    /** `true` if user's user-following is hidden */
    super_following_hidden: boolean,
    /** Amount of total tweets the user created */
    tweets_count: number,
    /** Amount of tweets the user created that contain media */
    media_count: number,
    /** Amount of tweets the user has liked */
    likes_count: number,
    /** Amount of lists the user is on */
    listed_count: number,
    /** Amount of their tweets the user has highlighted */
    highlighted_tweets_count: number,
    username: string,
    /** The full url on the user's profile, `undefined` if empty */
    url?: string,
    verification: {
        /** Shows the kind of verification the user has */
        kind: VerificationKind,
        /** `true` if the user has a verification chechmark */
        is_verified: boolean,
        /** When the user was initially verified */
        verified_since?: string,
        /** `true` if the user successfully verified their identity with a legal id */
        verified_with_id: boolean
    },
    /** `true` if retweets of the user should be included in your timelines */
    want_retweets: boolean,
    /** `true` if tweets of the user should give you notifications */
    want_notifications: boolean
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
    avatar_url: string,
    /** Country the user is based in */
    based_in?: string,
    created_at: string,
    name: string,
    /** `true` if the user's tweets can only be viewed by users that follow them */
    protected: boolean,
    verification: {
        verified: boolean,
        verified_since?: string,
        verified_with_id: boolean
    },
    /** `true` if the user is using a VPN */
    vpn: boolean,
    usernames: {
        /** Total times this user's username was changed */
        changed_count: number,
        current: string,
        updated_at?: string
    }
}
