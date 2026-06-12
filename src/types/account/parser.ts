import { match } from '../../utils/index.js';
import { InboxPrivacy, type Settings } from './index.js';

export function settings(value: any): Settings {
    return {
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
