import { match } from '../../utils/index.js';
import { CommunityRole, type CommunityKind, type User } from '../index.js';
import * as p from '../parsers.js';

export function community(value: any): CommunityKind {
    if (!value || value.__typename === 'CommunityUnavailable') {
        return { __typename: 'UnavailableCommunity' };
    }

    return {
        __typename: 'Community',
        id: BigInt(value.id_str),
        bannerUrl: value.custom_banner_media?.media_info?.original_img_url,
        canJoin: value.join_policy === 'Open',
        canInvite: value.invites_policy === 'MemberInvitesAllowed' && !value.invites_result?.__typename.includes('Unavailable'),
        createdAt: new Date(value.created_at).toISOString(),
        creator: p.user(value.creator_results?.result) as User,
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
            ['Moderator', CommunityRole.Moderator],
        ], CommunityRole.Owner),
        rules: (value.rules || []).map((rule: any) => ({
            id: BigInt(rule.rest_id),
            description: rule.description,
            name: rule.name
        })),
        topic: value.primary_community_topic?.topic_name
    };
}
