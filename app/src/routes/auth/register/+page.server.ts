import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createSession, setSessionCookie } from '$lib/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/home');
	return {};
};

export const actions: Actions = {
	register: async (event) => {
		const data = await event.request.formData();
		const displayName = (data.get('displayName') as string)?.trim();
		const handle = (data.get('handle') as string)?.trim().toLowerCase();
		const email = (data.get('email') as string)?.trim().toLowerCase();
		const password = data.get('password') as string;

		if (!displayName || !handle || !email || !password) {
			return fail(400, { error: 'All fields are required.', displayName, handle, email, handleError: undefined });
		}

		if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
			return fail(400, { error: 'Handle can only contain letters, numbers, and underscores.', displayName, handle, email, handleError: 'Invalid handle' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.', displayName, handle, email, handleError: undefined });
		}

		// Check existing
		const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (existing.length) {
			return fail(400, { error: 'An account with that email already exists.', displayName, handle, email, handleError: undefined });
		}

		const existingHandle = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
		if (existingHandle.length) {
			return fail(400, { error: 'That handle is already taken.', displayName, handle, email, handleError: undefined });
		}

		const passwordHash = await bcrypt.hash(password, 12);

		const [user] = await db.insert(users).values({
			handle,
			displayName,
			email,
			passwordHash,
		}).returning();

		const { id: sessionId, expiresAt } = await createSession(user.id);
		setSessionCookie(event, sessionId, expiresAt);

		throw redirect(302, '/home');
	}
};
