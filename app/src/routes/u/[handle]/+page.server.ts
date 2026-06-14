import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, posts, follows, likes, saves, bountyClaims, transactions, vouches } from '$lib/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getChainProfile, unlink } from '$lib/server/services';
import { getUserPostRanks } from '$lib/server/ranking';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [profileUser] = await db
		.select()
		.from(users)
		.where(eq(users.handle, params.handle))
		.limit(1);

	if (!profileUser) throw error(404, 'User not found');

	const userPosts = await db
		.select()
		.from(posts)
		.where(eq(posts.authorId, profileUser.id))
		.orderBy(desc(posts.createdAt));

	const [followerRows, followingRows, claimRows, vouchesGivenRow] = await Promise.all([
		db.select().from(follows).where(eq(follows.followingId, profileUser.id)),
		db.select().from(follows).where(eq(follows.followerId, profileUser.id)),
		db.select({ status: bountyClaims.status, vouchCount: bountyClaims.vouchCount }).from(bountyClaims).where(eq(bountyClaims.userId, profileUser.id)),
		db.select({ count: sql<number>`count(*)` }).from(vouches).where(eq(vouches.voucherId, profileUser.id)),
	]);

	let isFollowing = false;
	let userLikes: string[] = [];
	let userSaves: string[] = [];
	let userRanks = new Map<string, number>();

	if (locals.user && locals.user.id !== profileUser.id) {
		const followCheck = await db
			.select()
			.from(follows)
			.where(and(eq(follows.followerId, locals.user.id), eq(follows.followingId, profileUser.id)))
			.limit(1);
		isFollowing = followCheck.length > 0;
	}

	const postIds = userPosts.map((p) => p.id);
	if (locals.user && postIds.length > 0) {
		const likeRows = await db
			.select()
			.from(likes)
			.where(and(eq(likes.userId, locals.user.id), inArray(likes.postId, postIds)));
		userLikes = likeRows.map((l) => l.postId);

		const saveRows = await db
			.select()
			.from(saves)
			.where(and(eq(saves.userId, locals.user.id), inArray(saves.postId, postIds)));
		userSaves = saveRows.map((s) => s.postId);

		userRanks = await getUserPostRanks(locals.user.id, postIds);
	}

	const authorityInput = {
		postRankSum: userPosts.reduce((sum, p) => sum + p.rankScore, 0),
		vouchesReceived: claimRows.reduce((sum, c) => sum + c.vouchCount, 0),
		vouchesGiven: Number(vouchesGivenRow[0]?.count ?? 0),
	};

	const { passwordHash, email, ...safeUser } = profileUser;
	const isOwnProfile = locals.user?.id === profileUser.id;

	let shieldedBalance = null;
	if (isOwnProfile) {
		const payoutRows = await db
			.select({ amountUsdc: transactions.amountUsdc })
			.from(transactions)
			.where(and(eq(transactions.userId, profileUser.id), eq(transactions.type, 'bounty_payout')));
		const totalEarningsUsdc = payoutRows.reduce((sum, r) => sum + r.amountUsdc, 0);
		shieldedBalance = unlink.getShieldedBalance(profileUser, totalEarningsUsdc);
	}

	return {
		profileUser: safeUser,
		chainProfile: getChainProfile(profileUser, userPosts, claimRows, authorityInput),
		posts: userPosts.map((p) => ({
			...p,
			author: {
				id: profileUser.id,
				handle: profileUser.handle,
				displayName: profileUser.displayName,
				avatarUrl: profileUser.avatarUrl,
				isAgent: profileUser.isAgent,
				worldIdVerified: profileUser.worldIdVerified,
			},
			liked: userLikes.includes(p.id),
			saved: userSaves.includes(p.id),
			userRank: userRanks.get(p.id) ?? 0,
		})),
		followerCount: followerRows.length,
		followingCount: followingRows.length,
		isFollowing,
		isOwnProfile,
		shieldedBalance,
	};
};
