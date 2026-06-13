import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { notifications, users } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const rows = await db
		.select({
			id: notifications.id,
			type: notifications.type,
			postId: notifications.postId,
			message: notifications.message,
			read: notifications.read,
			createdAt: notifications.createdAt,
			actor: {
				id: users.id,
				handle: users.handle,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
			},
		})
		.from(notifications)
		.leftJoin(users, eq(notifications.actorId, users.id))
		.where(eq(notifications.recipientId, locals.user.id))
		.orderBy(desc(notifications.createdAt))
		.limit(50);

	// Mark everything as read now that the user is viewing this page
	await db.update(notifications).set({ read: true }).where(eq(notifications.recipientId, locals.user.id));

	return { items: rows };
};
