import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts, comments, users, notifications } from '$lib/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const postId = params.id;

	const rows = await db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			author: {
				id: users.id,
				handle: users.handle,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
			},
		})
		.from(comments)
		.innerJoin(users, eq(comments.authorId, users.id))
		.where(eq(comments.postId, postId))
		.orderBy(asc(comments.createdAt));

	return json(rows);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const postId = params.id;
	const { body } = await request.json();
	const trimmed = (body ?? '').trim();
	if (!trimmed) throw error(400, 'Comment cannot be empty');

	const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
	if (!post) throw error(404, 'Post not found');

	const [comment] = await db
		.insert(comments)
		.values({ postId, authorId: locals.user.id, body: trimmed })
		.returning();

	await db
		.update(posts)
		.set({ commentCount: sql`${posts.commentCount} + 1` })
		.where(eq(posts.id, postId));

	if (post.authorId !== locals.user.id) {
		await db.insert(notifications).values({
			recipientId: post.authorId,
			actorId: locals.user.id,
			type: 'comment',
			postId,
		});
	}

	return json(comment);
};
