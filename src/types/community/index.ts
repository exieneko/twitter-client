import type { User } from '../index.js';
import type { Enum, Type } from '../internal.js';

/**
 * A Twitter community
 */
export interface Community extends Type<'Community'> {
    id: string,
    /** URL for the community's banner and preview image */
    banner_url?: string,
    /** `true` if you can join this community without an invite */
    can_join: boolean,
    /** `true` if  you can invite others to this community */
    can_invite: boolean,
    created_at: string,
    creator: User,
    description: string,
    /** `true` if you're a member or moderator of the community */
    is_member: boolean,
    /** Amount of members in this community */
    members_count: number,
    /** Amount of moderators in this community */
    moderators_count: number,
    name: string,
    /** `true` if the community is marked as NSFW */
    is_nsfw: boolean,
    /** `true` if the community is pinned on your timelines */
    is_pinned: boolean,
    /** Your role in the community */
    role: CommunityRole,
    /** Community rules */
    rules: {
        id: string,
        description?: string,
        name: string
    }[],
    /** Primary topic of the community */
    topic: string
}

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



/**
 * Represents an unavailable community as a fallback
 */
export interface UnavailableCommunity extends Type<'UnavailableCommunity'> {}

export type CommunityKind = Community | UnavailableCommunity;
