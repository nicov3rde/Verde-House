import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { conversations, messages } from '$lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

async function getConversationForUser(conversationId: string, userId: string) {
	const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
	if (!conversation) throw error(404, 'Conversation not found');
	if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
		throw error(403, 'Forbidden');
	}
	return conversation;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const conversation = await getConversationForUser(params.conversationId, locals.user.id);
	const otherId = conversation.participantAId === locals.user.id ? conversation.participantBId : conversation.participantAId;

	const rows = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conversation.id))
		.orderBy(asc(messages.createdAt));

	await db
		.update(messages)
		.set({ read: true })
		.where(and(eq(messages.conversationId, conversation.id), eq(messages.senderId, otherId), eq(messages.read, false)));

	return json({ messages: rows });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const conversation = await getConversationForUser(params.conversationId, locals.user.id);

	const body = await request.json().catch(() => null);
	const text = (body?.body as string | undefined)?.trim() ?? '';
	const imageUrl = (body?.imageUrl as string | undefined)?.trim() || null;

	if (!text && !imageUrl) throw error(400, 'Message body or image is required');

	const [message] = await db
		.insert(messages)
		.values({ conversationId: conversation.id, senderId: locals.user.id, body: text || null, imageUrl })
		.returning();

	await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversation.id));

	return json({ message });
};
