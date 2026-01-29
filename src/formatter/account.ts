import type { Settings } from '../types/account.js';

export function settings(value: any): Settings {
    return {
        autoplay: !value.autoplay_disabled,
        country: value.country_code || 'us',
        display_sensitive_media: !!value.display_sensitive_media,
        dm_allowed_from: value.allow_dms_from === 'following'
            ? 'Following'
        : value.allow_dms_from === 'verified'
            ? 'Verified'
            : 'All',
        dm_groups_allowed_from: value.allow_dm_groups_from === 'following'
            ? 'Following'
            : 'All',
        dm_receipts: value.dm_receipt_setting !== 'all_disabled',
        dm_quality_filter: value.dm_quality_filter !== 'disabled',
        is_eu: value.settings_medadata?.is_eu === 'true',
        is_email_public: !!value.discoverable_by_email_address,
        is_nsfw: !!value.nfsw_user || !!value.nsfw_admin,
        is_phone_number_public: !!value.discoverable_by_mobile_phone,
        lang: value.language,
        protected: !!value.protected,
        privacy: {
            allow_personalized_ads: !!value.allow_ads_personalization,
            allow_cookies: !!value.use_cookie_personalization,
            allow_selling_your_information: !!value.allow_sharing_data_for_third_party_personalization,
            allow_location_history: !!value.allow_location_history_personalization,
            personalized_trends: !!value.personalized_trends,
            show_current_audiospace_publicly: !!value.ext_sharing_audiospaces_listening_data_with_followers
        },
        username: value.screen_name
    };
}
