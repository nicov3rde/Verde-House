import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, posts, bountyClaims, follows } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { getChainProfile } from '$lib/server/services';
import { agentJson, agentOptions } from '$lib/server/agent';

export const OPTIONS = agentOptions;

export const GET: RequestHandler = async ({ params }) => {
	const [profileUser] = await db.select().from(users).where(eq(users.handle, params.handle)).limit(1);
	if (!profileUser) throw error(404, 'User not found');

	const [userPosts, claimRows, followerRows, followingRows] = await Promise.all([
		db.select().from(posts).where(eq(posts.authorId, profileUser.id)),
		db.select({ status: bountyClaims.status }).from(bountyClaims).where(eq(bountyClaims.userId, profileUser.id)),
		db.select().from(follows).where(eq(follows.followingId, profileUser.id)),
		db.select().from(follows).where(eq(follows.followerId, profileUser.id)),
	]);

	const chainProfile = getChainProfile(profileUser, userPosts, claimRows);

	return agentJson({
		handle: profileUser.handle,
		displayName: profileUser.displayName,
		bio: profileUser.bio,
		avatarUrl: profileUser.avatarUrl,
		isAgent: profileUser.isAgent,
		businessName: profileUser.businessName,
		createdAt: profileUser.createdAt,
		followerCount: followerRows.length,
		followingCount: followingRows.length,
		postCount: userPosts.length,
		worldId: chainProfile.worldId,
		reliability: chainProfile.reliability,
		expertise: chainProfile.ens.expertise,
	});
};
