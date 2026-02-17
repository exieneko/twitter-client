import type { Enum } from '../index.js';

export interface Settings {
    autoplay: boolean,
    country: string,
    display_sensitive_media: boolean,
    dm_allowed_from: InboxPrivacy,
    dm_groups_allowed_from: InboxPrivacy,
    dm_receipts: boolean,
    dm_quality_filter: boolean,
    is_eu: boolean,
    is_email_public: boolean,
    is_nsfw: boolean,
    is_phone_number_public: boolean,
    lang: string,
    protected: boolean,
    privacy: {
        allow_personalized_ads: boolean,
        allow_cookies: boolean,
        allow_selling_your_information: boolean,
        allow_location_history: boolean,
        show_current_audiospace_publicly: boolean,
        personalized_trends: boolean
    },
    username: string
}

export const InboxPrivacy = {
    Everyone: 'Everyone',
    Following: 'Following',
    Verified: 'Verified'
} as const;
export type InboxPrivacy = Enum<typeof InboxPrivacy>;
