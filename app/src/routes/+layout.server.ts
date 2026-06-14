import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { notifications, conversations, messages } from '$lib/db/schema';
import { eq, and, or, inArray, ne } from 'drizzle-orm';
import { isDeveloper } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null, unreadNotifications: 0, unreadMessages: 0, isDeveloper: false };
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

	let unreadMessages = 0;
	try {
		const convoRows = await db
			.select({ id: conversations.id })
			.from(conversations)
			.where(or(eq(conversations.participantAId, locals.user.id), eq(conversations.participantBId, locals.user.id)));
		const convoIds = convoRows.map((c) => c.id);
		if (convoIds.length > 0) {
			const unread = await db
				.select()
				.from(messages)
				.where(
					and(
						inArray(messages.conversationId, convoIds),
						eq(messages.read, false),
						ne(messages.senderId, locals.user.id),
					),
				);
			unreadMessages = unread.length;
		}
	} catch {
		// DB not connected yet
	}

	const { passwordHash, ...safeUser } = locals.user;

	return {
		user: safeUser,
		unreadNotifications,
		unreadMessages,
		isDeveloper: isDeveloper(locals.user),
	};
};
