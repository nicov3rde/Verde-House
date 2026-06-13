import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { conversations, users } from '$lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body = await request.json().catch(() => null);
	const handle = (body?.handle as string | undefined)?.trim().replace(/^@/, '');
	const userId = body?.userId as string | undefined;

	let targetId = userId;
	if (!targetId && handle) {
		const [target] = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1);
		if (!target) throw error(404, 'User not found');
		targetId = target.id;
	}

	if (!targetId) throw error(400, 'userId or handle is required');
	if (targetId === locals.user.id) throw error(400, "Can't message yourself");

	const existing = await db
		.select()
		.from(conversations)
		.where(
			or(
				and(eq(conversations.participantAId, locals.user.id), eq(conversations.participantBId, targetId)),
				and(eq(conversations.participantAId, targetId), eq(conversations.participantBId, locals.user.id)),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		return json({ id: existing[0].id });
	}

	const [created] = await db
		.insert(conversations)
		.values({ participantAId: locals.user.id, participantBId: targetId })
		.returning();

	return json({ id: created.id });
};
