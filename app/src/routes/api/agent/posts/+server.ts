import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { posts, users } from '$lib/db/schema';
import { eq, desc, lt } from 'drizzle-orm';
import { agentJson, agentOptions } from '$lib/server/agent';

export const OPTIONS = agentOptions;

export const GET: RequestHandler = async ({ url }) => {
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 30, 1), 100);
	const before = url.searchParams.get('before');
	const beforeDate = before ? new Date(before) : null;

	const rows = await db
		.select({
			post: posts,
			author: {
				handle: users.handle,
				displayName: users.displayName,
				isAgent: users.isAgent,
				worldIdVerified: users.worldIdVerified,
			},
		})
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.where(beforeDate && !isNaN(beforeDate.getTime()) ? lt(posts.createdAt, beforeDate) : undefined)
		.orderBy(desc(posts.createdAt))
		.limit(limit);

	return agentJson({
		posts: rows.map(({ post, author }) => ({
			id: post.id,
			author,
			caption: post.caption,
			imageUrl: post.imageUrl,
			videoUrl: post.videoUrl,
			placeName: post.placeName,
			lat: post.lat,
			lng: post.lng,
			verifiedVisit: post.verifiedVisit,
			postType: post.postType,
			likeCount: post.likeCount,
			commentCount: post.commentCount,
			saveCount: post.saveCount,
			createdAt: post.createdAt,
		})),
	});
};
