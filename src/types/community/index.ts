import type { Enum, User } from '../index.js';

/**
 * Represents a single Twitter community
 */
export interface Community {
    __typename: 'Community',
    id: string,
    /** The url for the community's banner and preview image, `undefined` if none is set */
    banner_url?: string,
    /** Whether you can join a community without an invite */
    can_join: boolean,
    /** Whether you can invite others to this community */
    can_invite: boolean,
    /** The community's creation datetime as an ISO string */
    created_at: string,
    creator: User,
    description: string,
    /** Whether or not you're a member of the community */
    member: boolean,
    /** Amount of members in this community */
    members_count: number,
    /** Amount of moderators in this community */
    moderators_count: number,
    /** The community's display name */
    name: string,
    /** Whether or not the community is marked as NSFW */
    nsfw: boolean,
    /** Whether or not the community is pinned on your timelines */
    pinned: boolean,
    /** Your role in the community */
    role: CommunityRole,
    rules: {
        id: string,
        description?: string,
        name: string
    }[],
    /** The primary topic of the community */
    topic: string
}

export const CommunityRole = {
    Guest: 'Guest',
    Member: 'Member',
    Moderator: 'Moderator',
    Owner: 'Owner'
} as const;
export type CommunityRole = Enum<typeof CommunityRole>;



/**
 * Represents an unavailable community as a fallback
 */
export interface UnavailableCommunity {
    __typename: 'UnavailableCommunity'
}

export type CommunityKind = Community | UnavailableCommunity;
