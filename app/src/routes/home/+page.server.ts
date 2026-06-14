import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts, users, follows, likes, saves } from '$lib/db/schema';
import { eq, desc, inArray, and, or } from 'drizzle-orm';
import type { PostWithAuthor } from '$lib/types';
import { getUserPostRanks } from '$lib/server/ranking';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;
	const feedPref = locals.user.feedPreference;

	// Get followed user IDs
	const followedRows = await db
		.select({ followingId: follows.followingId })
		.from(follows)
		.where(eq(follows.followerId, userId));

	const followedIds = followedRows.map((r) => r.followingId);
	// Always include own posts
	const feedIds = [...followedIds, userId];

	// Build posts query
	let allPosts: PostWithAuthor[];
	try {
		allPosts = await db
			.select({
				post: posts,
				author: {
					id: users.id,
					handle: users.handle,
					displayName: users.displayName,
					avatarUrl: users.avatarUrl,
					isAgent: users.isAgent,
					worldIdVerified: users.worldIdVerified,
				},
			})
			.from(posts)
			.innerJoin(users, eq(posts.authorId, users.id))
			.where(feedIds.length > 0 ? inArray(posts.authorId, feedIds) : eq(posts.authorId, userId))
			.orderBy(desc(posts.createdAt))
			.limit(30);
	} catch {
		allPosts = [];
	}

	// Filter by feed preference
	let filtered = allPosts;
	if (feedPref === 'humans') filtered = allPosts.filter((p) => !p.author.isAgent);
	if (feedPref === 'agents') filtered = allPosts.filter((p) => p.author.isAgent);

	// Get user's likes, saves & ranks
	let userLikes: string[] = [];
	let userSaves: string[] = [];
	let userRanks = new Map<string, number>();
	try {
		const postIds = filtered.map((p) => p.post.id);
		if (postIds.length > 0) {
			const likeRows = await db.select().from(likes).where(and(eq(likes.userId, userId), inArray(likes.postId, postIds)));
			userLikes = likeRows.map((l) => l.postId);
			const saveRows = await db.select().from(saves).where(and(eq(saves.userId, userId), inArray(saves.postId, postIds)));
			userSaves = saveRows.map((s) => s.postId);
			userRanks = await getUserPostRanks(userId, postIds);
		}
	} catch {
		// ignore
	}

	const { passwordHash, ...safeUser } = locals.user;

	return {
		feedPosts: filtered.map((p) => ({
			...p.post,
			author: p.author,
			liked: userLikes.includes(p.post.id),
			saved: userSaves.includes(p.post.id),
			userRank: userRanks.get(p.post.id) ?? 0,
		})),
		user: safeUser,
	};
};
