import type { UserResult } from './index.js';
import type { Type } from './utils.js';

export interface Community extends Type<'Community'> {
    id: string,
    bannerUrl?: string,
    /** Whether the authenticated user can freely join */
    canJoin: boolean,
    /** Whether the authenticaed user can invite others */
    canInvite: boolean,
    createdAt: string,
    creator: UserResult,
    description: string,
    /** Whether the authenticaed user is a member or moderator of the community */
    isMember: boolean,
    /** Amount of members in this community */
    membersCount: number,
    /** Amount of moderators in this community */
    moderatorsCount: number,
    name: string,
    isNsfw: boolean,
    /** `Whether the community is pinned on the timelines of the authenticated user */
    isPinned: boolean,
    /** Role of the authenticated user in the community */
    role: CommunityRole,
    rules: {
        id: string,
        description?: string,
        name: string
    }[],
    /** Primary topic of the community */
    topic: string
}

export interface UnavailableCommunity extends Type<'UnavailableCommunity'> {}
export type CommunityResult = Community | UnavailableCommunity;

/**
 * Community roles
 * 
 * @default CommunityRole.Guest
 */
export enum CommunityRole {
    Guest = 'Guest',
    Member = 'Member',
    Moderator = 'Moderator',
    Owner = 'Owner'
}
