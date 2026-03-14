import type { Enum } from '../internal.js';

/**
 * Settings for the current user
 */
export interface Settings {
    /** `true` if autoplay of videos and gifs is allowed */
    autoplay: boolean,
    /** Your country code */
    country: string,
    /** `true` if sensitive media should be displayed to you */
    display_sensitive_media: boolean,
    /** Privacy option controlling which users can send you dm requests */
    dm_allowed_from: InboxPrivacy,
    /** Privacy option controlling which users can add you to a dm group */
    dm_groups_allowed_from: InboxPrivacy,
    /** `true` if "read" receipt information should be shown to other users you message */
    dm_receipts: boolean,
    /** `true` if low quality dms should be filtered into a separate menu */
    dm_quality_filter: boolean,
    /** `true` if your country is an EU member */
    is_eu: boolean,
    /** `true` if other users can find you by your email */
    is_email_public: boolean,
    /** `true` if your account is NSFW */
    is_nsfw: boolean,
    /** Can other users find you by your phone number? */
    is_phone_number_public: boolean,
    /** Twitter client language */
    language: string,
    /** `true` if your tweets are protected */
    protected: boolean,
    /** Additional boolean privacy options */
    privacy: {
        /** `true` if ads you see should be personalized. This package will filter out ads */
        allow_personalized_ads: boolean,
        /** `true` if cookies were accepted */
        allow_cookies: boolean,
        /** `true` if Twitter was given permission to share your data to third parties */
        allow_selling_your_information: boolean,
        /** `true` if location history is used for timeline personalization */
        allow_location_history: boolean,
        /** `true` if the audiospace you're listening to should be visible to others */
        show_current_audiospace_publicly: boolean,
        /** `true` if sidebar trends should be personalized according to usage data */
        personalized_trends: boolean
    },
    username: string
}

/**
 * Privacy option
 * 
 * @enum
 */
export const InboxPrivacy = {
    Everyone: 'Everyone',
    Following: 'Following',
    Verified: 'Verified'
} as const;
export type InboxPrivacy = Enum<typeof InboxPrivacy>;
