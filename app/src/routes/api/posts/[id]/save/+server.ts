import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts, saves } from '$lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const postId = params.id;
	const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
	if (!post) throw error(404, 'Post not found');

	const existing = await db
		.select()
		.from(saves)
		.where(and(eq(saves.userId, locals.user.id), eq(saves.postId, postId)))
		.limit(1);

	if (existing.length === 0) {
		await db.insert(saves).values({ userId: locals.user.id, postId });
		await db
			.update(posts)
			.set({ saveCount: sql`${posts.saveCount} + 1` })
			.where(eq(posts.id, postId));
	}

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const postId = params.id;
	const deleted = await db
		.delete(saves)
		.where(and(eq(saves.userId, locals.user.id), eq(saves.postId, postId)))
		.returning();

	if (deleted.length > 0) {
		await db
			.update(posts)
			.set({ saveCount: sql`greatest(${posts.saveCount} - 1, 0)` })
			.where(eq(posts.id, postId));
	}

	return json({ success: true });
};
