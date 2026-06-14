import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts, postRanks } from '$lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { recomputeAuthorityScore } from '$lib/server/ranking';

/**
 * Peer Ranking Engine: cast, switch, or remove an up/down vote on a post.
 * One vote per user per post — posting the same value again removes it.
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { value } = await request.json();
	if (value !== 1 && value !== -1) throw error(400, 'value must be 1 or -1');

	const postId = params.id;
	const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
	if (!post) throw error(404, 'Post not found');

	const [existing] = await db
		.select()
		.from(postRanks)
		.where(and(eq(postRanks.userId, locals.user.id), eq(postRanks.postId, postId)))
		.limit(1);

	let userRank = value;
	let delta = value;

	if (!existing) {
		await db.insert(postRanks).values({ userId: locals.user.id, postId, value });
	} else if (existing.value === value) {
		await db.delete(postRanks).where(eq(postRanks.id, existing.id));
		userRank = 0;
		delta = -existing.value;
	} else {
		await db.update(postRanks).set({ value }).where(eq(postRanks.id, existing.id));
		delta = value - existing.value;
	}

	const [updated] = await db
		.update(posts)
		.set({ rankScore: sql`${posts.rankScore} + ${delta}` })
		.where(eq(posts.id, postId))
		.returning({ rankScore: posts.rankScore });

	await recomputeAuthorityScore(post.authorId);

	return json({ rankScore: updated.rankScore, userRank });
};
