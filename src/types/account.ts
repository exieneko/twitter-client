import type { Enum, Model, Type } from './internal/index.js';
import { match } from '../utils/index.js';

/**
 * Settings for the current user
 */
export interface AccountSettings extends Type<'AccountSettings'> {
    /** `true` if autoplay of videos and gifs is allowed */
    autoplay: boolean,
    /** Your country code */
    country: string,
    /** `true` if sensitive media should be displayed to you */
    displaySensitiveMedia: boolean,
    /** Privacy option controlling which users can send you dm requests */
    dmAllowedFrom: InboxPrivacy,
    /** Privacy option controlling which users can add you to a dm group */
    dmGroupsAllowedFrom: InboxPrivacy,
    /** `true` if "read" receipt information should be shown to other users you message */
    dmReceipts: boolean,
    /** `true` if low quality dms should be filtered into a separate menu */
    dmQualityFilter: boolean,
    /** `true` if your country is an EU member */
    isEu: boolean,
    /** `true` if other users can find you by your email */
    isEmailPublic: boolean,
    /** `true` if your account is NSFW */
    isNsfw: boolean,
    /** Can other users find you by your phone number? */
    isPhoneNumberPublic: boolean,
    /** Twitter client language */
    language: string,
    /** `true` if your tweets are protected */
    protected: boolean,
    /** Additional boolean privacy options */
    privacy: {
        /** `true` if ads you see should be personalized. This package will filter out ads */
        allowPersonalizedAds: boolean,
        /** `true` if cookies were accepted */
        allowCookies: boolean,
        /** `true` if Twitter was given permission to share your data to third parties */
        allowSellingYourInformation: boolean,
        /** `true` if location history is used for timeline personalization */
        allowLocationHistory: boolean,
        /** `true` if the audiospace you're listening to should be visible to others */
        showCurrentAudiospacePublicly: boolean,
        /** `true` if sidebar trends should be personalized according to usage data */
        personalizedTrends: boolean
    },
    username: string
}
export const AccountSettings: Model<AccountSettings> = {
    async new(_, value) {
        return {
            __typename: 'AccountSettings',
            autoplay: !value.autoplay_disabled,
            country: value.country_code || 'us',
            displaySensitiveMedia: !!value.display_sensitive_media,
            dmAllowedFrom: match(value.allow_dms_from, [
                ['following', InboxPrivacy.Following],
                ['verified', InboxPrivacy.Verified],
            ], InboxPrivacy.Everyone),
            dmGroupsAllowedFrom: match(value.allow_dm_groups_from, [
                ['following', InboxPrivacy.Following],
                ['verified', InboxPrivacy.Verified],
            ], InboxPrivacy.Everyone),
            dmReceipts: value.dm_receipt_setting !== 'all_disabled',
            dmQualityFilter: value.dm_quality_filter !== 'disabled',
            isEu: value.settings_medadata?.is_eu === 'true',
            isEmailPublic: !!value.discoverable_by_email_address,
            isNsfw: !!value.nfsw_user || !!value.nsfw_admin,
            isPhoneNumberPublic: !!value.discoverable_by_mobile_phone,
            language: value.language,
            protected: !!value.protected,
            privacy: {
                allowPersonalizedAds: !!value.allow_ads_personalization,
                allowCookies: !!value.use_cookie_personalization,
                allowSellingYourInformation: !!value.allow_sharing_data_for_third_party_personalization,
                allowLocationHistory: !!value.allow_location_history_personalization,
                personalizedTrends: !!value.personalized_trends,
                showCurrentAudiospacePublicly: !!value.ext_sharing_audiospaces_listening_data_with_followers
            },
            username: value.screen_name
        };
    }
};

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
