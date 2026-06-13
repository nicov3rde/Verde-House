import { db } from '$lib/db';
import { sessions, users } from '$lib/db/schema';
import { eq, gt } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

export const SESSION_COOKIE = 'vh_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateSessionId(): string {
	return randomBytes(32).toString('hex');
}

export async function createSession(userId: string) {
	const id = generateSessionId();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return { id, expiresAt };
}

export async function validateSession(sessionId: string) {
	const result = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (!result.length) return { session: null, user: null };

	const { session, user } = result[0];

	if (new Date() > session.expiresAt) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return { session: null, user: null };
	}

	// Roll session if < 15 days left
	const fifteenDays = 15 * 24 * 60 * 60 * 1000;
	if (session.expiresAt.getTime() - Date.now() < fifteenDays) {
		const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
		await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, sessionId));
		session.expiresAt = newExpiry;
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function setSessionCookie(event: RequestEvent, sessionId: string, expiresAt: Date) {
	event.cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt,
	});
}

export function deleteSessionCookie(event: RequestEvent) {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

export type SessionUser = typeof users.$inferSelect;
