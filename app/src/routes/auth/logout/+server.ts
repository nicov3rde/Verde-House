import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { invalidateSession, deleteSessionCookie, SESSION_COOKIE } from '$lib/auth';

export const POST: RequestHandler = async (event) => {
	const sessionId = event.cookies.get(SESSION_COOKIE);
	if (sessionId) {
		await invalidateSession(sessionId);
		deleteSessionCookie(event);
	}
	throw redirect(302, '/auth/login');
};
