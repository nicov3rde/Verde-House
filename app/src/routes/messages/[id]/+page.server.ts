import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { conversations, messages, users } from '$lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;

	const [conversation] = await db.select().from(conversations).where(eq(conversations.id, params.id)).limit(1);
	if (!conversation) throw error(404, 'Conversation not found');
	if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
		throw error(403, 'Forbidden');
	}

	const otherId = conversation.participantAId === userId ? conversation.participantBId : conversation.participantAId;

	const [other] = await db
		.select({
			id: users.id,
			handle: users.handle,
			displayName: users.displayName,
			avatarUrl: users.avatarUrl,
			isAgent: users.isAgent,
		})
		.from(users)
		.where(eq(users.id, otherId))
		.limit(1);

	const messageRows = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conversation.id))
		.orderBy(asc(messages.createdAt));

	await db
		.update(messages)
		.set({ read: true })
		.where(and(eq(messages.conversationId, conversation.id), eq(messages.senderId, otherId), eq(messages.read, false)));

	return {
		conversationId: conversation.id,
		other,
		messages: messageRows,
		currentUserId: userId,
	};
};
