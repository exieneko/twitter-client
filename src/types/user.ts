/**
 * Represents a single user
 */
export interface User {
    __typename: 'User',
    id: string,
    /**
     * Amount of affiliates the user has\
     * Will always be `0` if `this.verification_kind` isn't `VerificationKind.Business`, since only business accounts can have affiliates
     */
    affiliates_count: number,
    /** The user's affiliate label if they're associated with a business account */
    affiliate_label?: {
        /** Title of the label */
        title: string,
        /** The business account's \@username that the user is an affiliate of */
        owner: string,
        /** Image displayed on the label, which is the `avatar_url` of the business account */
        image_url: string
    },
    /** The url for the user's profile picture */
    avatar_url: string,
    /** The url for the user's banner, `undefined` if the user hasn't set a banner yet */
    banner_url?: string,
    /** The user's birthday. `year` may be `undefined` if the user chose to display on the month and day */
    birthday?: {
        day: number,
        month: number,
        year?: number
    },
    /** Whether or not the user is blocked by you */
    blocked: boolean,
    /** Whether or not the user has blocked you */
    blocked_by: boolean,
    /** Whether or not you can send a direct message to the user */
    can_dm: boolean,
    /** Whether or not you can credit a user in a media tweet by tagging them directly in the attachment */
    can_media_tag: boolean,
    /** Whether or not the user allows others to super-follow them */
    can_super_follow: boolean,
    /** The user's registration datetime as an ISO string */
    created_at: string,
    description: string,
    /** Whether the user is a fan or parody account, `undefined` if neither */
    fan_account_kind?: FanAccountKind,
    /** Amount of followers the user has */
    followers_count: number,
    /** Amount of users the user is following */
    following_count: number,
    /** Whether or not you're following the user */
    followed: boolean,
    /**
     * Whether or not you've requested to follow the user\
     * Will always be `false` if `this.protected` is `false`
     */
    follow_requested: boolean,
    /** Whether or not the user follows you */
    followed_by: boolean,
    /** The user's set employment, `undefined` if empty */
    job?: string,
    /** The user's location, `undefined` if empty */
    location?: string,
    /** Whether or not the user is muted by you */
    muted: boolean,
    /** The user's display name */
    name: string,
    /** `id` of the user's pinned tweet, `undefined` if it doesn't exist */
    pinned_tweet_id?: string,
    /**
     * Whether or not the user's tweets can only be viewed by users that follow them\
     * Fetching tweets of this user will return an empty array if `this.followed` is false
     */
    protected: boolean,
    /**
     * Amount of other users the user is super-following\
     * Super-follows (aka creator subscriptions) are monthly subscriptions that the user pays to other users for super-follower-only tweets
     */
    super_following_count: number,
    /** Whether or not it can be viewed who the user is super-following */
    super_following_hidden: boolean,
    translatable: boolean,
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
    /** The user's unique \@username */
    username: string,
    /** The full url on the user's profile, `undefined` if empty */
    url?: string,
    /** Whether or not the user has a verification chechmark */
    verified: boolean,
    /** Shows the kind of verification the user has */
    verification_kind: VerificationKind,
    /**
     * Whether or not retweets of the user should be included in your timelines\
     * Will always be `false` if `this.followed` is `false`
     */
    want_retweets: boolean,
    /**
     * Whether or not tweets of the user should give you notifications\
     * Will always be `false` if `this.followed` is `false`
     */
    want_notifications: boolean
}

export type FanAccountKind = 'Fan' | 'Parody';

/** 
 * + `Unverified` - No verification
 * + `Blue` - Verification for buying Twitter Blue, being the affiliate of a business account, or having a legacy checkmark
 * + `Business` - Verification for being a business or organization, aka gold checkmark
 * + `Government` - Verification for being a government official, aka gray checkmark
*/
export type VerificationKind = 'Unverified' | 'Blue' | 'Business' | 'Government';

/**
 * Represents a user that doesn't exist, such as a user that has been suspended deactivated or a username that isn't taken
 */
export interface UnavailableUser {
    __typename: 'UnavailableUser' | 'SuspendedUser'
}

export type UserKind = User | UnavailableUser;
