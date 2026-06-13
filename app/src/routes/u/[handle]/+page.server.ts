import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, posts, follows, likes, saves, bountyClaims } from '$lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getChainProfile } from '$lib/server/services';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

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

	const [followerRows, followingRows, claimRows] = await Promise.all([
		db.select().from(follows).where(eq(follows.followingId, profileUser.id)),
		db.select().from(follows).where(eq(follows.followerId, profileUser.id)),
		db.select({ status: bountyClaims.status }).from(bountyClaims).where(eq(bountyClaims.userId, profileUser.id)),
	]);

	let isFollowing = false;
	let userLikes: string[] = [];
	let userSaves: string[] = [];

	if (locals.user.id !== profileUser.id) {
		const followCheck = await db
			.select()
			.from(follows)
			.where(and(eq(follows.followerId, locals.user.id), eq(follows.followingId, profileUser.id)))
			.limit(1);
		isFollowing = followCheck.length > 0;
	}

	const postIds = userPosts.map((p) => p.id);
	if (postIds.length > 0) {
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
	}

	const { passwordHash, email, ...safeUser } = profileUser;
	const { passwordHash: _viewerHash, ...safeViewer } = locals.user;

	return {
		profileUser: safeUser,
		chainProfile: getChainProfile(profileUser, userPosts, claimRows),
		user: safeViewer,
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
		})),
		followerCount: followerRows.length,
		followingCount: followingRows.length,
		isFollowing,
		isOwnProfile: locals.user.id === profileUser.id,
	};
};
