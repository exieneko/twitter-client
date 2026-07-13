import { User } from './index.js';
import type { Default, Enum, MaybeType, Model, Type, Wrapped } from './internal/index.js';
import { assert, match } from '../utils/index.js';

/**
 * A Twitter community
 */
export interface Community extends Type<'Community'> {
    id: bigint,
    /** URL for the community's banner and preview image */
    bannerUrl?: string,
    /** `true` if you can join this community without an invite */
    canJoin: boolean,
    /** `true` if  you can invite others to this community */
    canInvite: boolean,
    createdAt: string,
    creator: User,
    description: string,
    /** `true` if you're a member or moderator of the community */
    isMember: boolean,
    /** Amount of members in this community */
    membersCount: number,
    /** Amount of moderators in this community */
    moderatorsCount: number,
    name: string,
    /** `true` if the community is marked as NSFW */
    isNsfw: boolean,
    /** `true` if the community is pinned on your timelines */
    isPinned: boolean,
    /** Your role in the community */
    role: CommunityRole,
    /** Community rules */
    rules: {
        id: bigint,
        description?: string,
        name: string
    }[],
    /** Primary topic of the community */
    topic: string
}
export const Community: Wrapped<CommunityKind, Model<Community>> = {
    async new(fmt, value) {
        return {
            __typename: 'Community',
            id: BigInt(value.id_str),
            bannerUrl: value.custom_banner_media?.media_info?.original_img_url,
            canJoin: value.join_policy === 'Open',
            canInvite: value.invites_policy === 'MemberInvitesAllowed' && !value.invites_result?.__typename.includes('Unavailable'),
            createdAt: new Date(value.created_at).toISOString(),
            creator: await fmt.next(User, value.creator_results?.result),
            description: value.description || '',
            isMember: !!value.is_member,
            membersCount: value.member_count || 0,
            moderatorsCount: value.moderator_count || 0,
            name: value.name,
            isNsfw: !!value.is_nsfw,
            isPinned: !!value.is_pinned,
            role: match(value.role, [
                ['NonMember', CommunityRole.Guest],
                ['Member', CommunityRole.Member],
                ['Moderator', CommunityRole.Moderator]
            ], CommunityRole.Owner),
            rules: (value.rules as any[] || []).map(rule => ({
                id: BigInt(rule.rest_id),
                description: rule.description,
                name: rule.name
            })),
            topic: value.primary_community_topic?.topic_name
        };
    },
    assert(value) {
        return assert(value, 'Community');
    }
};

/**
 * Represents an unavailable community as a fallback
 */
export interface UnavailableCommunity extends Type<'UnavailableCommunity'> {}
export const UnavailableCommunity: Wrapped<CommunityKind, Model<UnavailableCommunity, any>> & Default<UnavailableCommunity> = {
    async new() {
        return this.default();
    },
    assert(value) {
        return assert(value, 'UnavailableCommunity');
    },
    default() {
        return {
            __typename: 'UnavailableCommunity'
        };
    }
};

export type CommunityKind = Community | UnavailableCommunity;
export const CommunityKind: Model<CommunityKind, MaybeType> & Default<CommunityKind> = {
    async new(fmt, value) {
        if (!value || value.__typename === 'CommunityUnavailable') {
            return await fmt.next(UnavailableCommunity, value);
        }

        return await fmt.next(Community, value);
    },
    default() {
        return UnavailableCommunity.default();
    }
};



/**
 * Community roles
 * 
 * @enum
 */
export const CommunityRole = {
    /**
     * Not a member
     * 
     * @default
     */
    Guest: 'Guest',
    Member: 'Member',
    Moderator: 'Moderator',
    Owner: 'Owner'
} as const;
export type CommunityRole = Enum<typeof CommunityRole>;
