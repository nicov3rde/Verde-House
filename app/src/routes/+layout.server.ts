import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { notifications } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null, unreadNotifications: 0 };
	}

	let unreadNotifications = 0;
	try {
		const unread = await db
			.select()
			.from(notifications)
			.where(and(eq(notifications.recipientId, locals.user.id), eq(notifications.read, false)));
		unreadNotifications = unread.length;
	} catch {
		// DB not connected yet
	}

	return {
		user: locals.user,
		unreadNotifications,
	};
};
