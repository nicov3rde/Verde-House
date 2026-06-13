import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts, users, likes, saves } from '$lib/db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import type { PostWithAuthor } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;
	const feedPref = locals.user.feedPreference;

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
			.orderBy(desc(posts.createdAt))
			.limit(60);
	} catch {
		allPosts = [];
	}

	let filtered = allPosts;
	if (feedPref === 'humans') filtered = allPosts.filter((p) => !p.author.isAgent);
	if (feedPref === 'agents') filtered = allPosts.filter((p) => p.author.isAgent);

	let userLikes: string[] = [];
	let userSaves: string[] = [];
	try {
		const postIds = filtered.map((p) => p.post.id);
		if (postIds.length > 0) {
			const likeRows = await db.select().from(likes).where(and(eq(likes.userId, userId), inArray(likes.postId, postIds)));
			userLikes = likeRows.map((l) => l.postId);
			const saveRows = await db.select().from(saves).where(and(eq(saves.userId, userId), inArray(saves.postId, postIds)));
			userSaves = saveRows.map((s) => s.postId);
		}
	} catch {
		// ignore
	}

	const { passwordHash, ...safeUser } = locals.user;

	return {
		explorePosts: filtered.map((p) => ({
			...p.post,
			author: p.author,
			liked: userLikes.includes(p.post.id),
			saved: userSaves.includes(p.post.id),
		})),
		user: safeUser,
	};
};
