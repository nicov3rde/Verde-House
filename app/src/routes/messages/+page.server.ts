import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { conversations, messages, users } from '$lib/db/schema';
import { eq, or, desc, inArray, and, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const userId = locals.user.id;

	const convoRows = await db
		.select()
		.from(conversations)
		.where(or(eq(conversations.participantAId, userId), eq(conversations.participantBId, userId)))
		.orderBy(desc(conversations.lastMessageAt));

	if (convoRows.length === 0) {
		return { conversations: [] };
	}

	const otherIds = convoRows.map((c) => (c.participantAId === userId ? c.participantBId : c.participantAId));
	const convoIds = convoRows.map((c) => c.id);

	const [otherUsers, recentMessages, unreadRows] = await Promise.all([
		db
			.select({
				id: users.id,
				handle: users.handle,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				isAgent: users.isAgent,
			})
			.from(users)
			.where(inArray(users.id, otherIds)),
		db
			.select()
			.from(messages)
			.where(inArray(messages.conversationId, convoIds))
			.orderBy(desc(messages.createdAt))
			.limit(500),
		db
			.select({ conversationId: messages.conversationId, count: sql<number>`count(*)` })
			.from(messages)
			.where(
				and(
					inArray(messages.conversationId, convoIds),
					eq(messages.read, false),
					sql`${messages.senderId} <> ${userId}`,
				),
			)
			.groupBy(messages.conversationId),
	]);

	const userMap = new Map(otherUsers.map((u) => [u.id, u]));
	const lastMessageMap = new Map<string, (typeof recentMessages)[number]>();
	for (const m of recentMessages) {
		if (!lastMessageMap.has(m.conversationId)) lastMessageMap.set(m.conversationId, m);
	}
	const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, Number(r.count)]));

	const list = convoRows.map((c) => {
		const otherId = c.participantAId === userId ? c.participantBId : c.participantAId;
		const last = lastMessageMap.get(c.id);
		return {
			id: c.id,
			other: userMap.get(otherId) ?? null,
			lastMessage: last
				? { body: last.body, imageUrl: last.imageUrl, senderId: last.senderId, createdAt: last.createdAt }
				: null,
			unreadCount: unreadMap.get(c.id) ?? 0,
			lastMessageAt: c.lastMessageAt,
		};
	});

	return { conversations: list };
};
