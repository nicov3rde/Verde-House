import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { follows, notifications } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const targetId = params.id;
	if (targetId === locals.user.id) throw error(400, "Can't follow yourself");

	const existing = await db
		.select()
		.from(follows)
		.where(and(eq(follows.followerId, locals.user.id), eq(follows.followingId, targetId)))
		.limit(1);

	if (existing.length === 0) {
		await db.insert(follows).values({ followerId: locals.user.id, followingId: targetId });
		await db.insert(notifications).values({
			recipientId: targetId,
			actorId: locals.user.id,
			type: 'follow',
		});
	}

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const targetId = params.id;
	await db
		.delete(follows)
		.where(and(eq(follows.followerId, locals.user.id), eq(follows.followingId, targetId)));

	return json({ success: true });
};
