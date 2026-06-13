import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createSession, setSessionCookie } from '$lib/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/');
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const data = await event.request.formData();
		const email = (data.get('email') as string)?.trim().toLowerCase();
		const password = data.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.', email });
		}

		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

		if (!user) {
			return fail(400, { error: 'Invalid email or password.', email });
		}

		const valid = await bcrypt.compare(password, user.passwordHash);
		if (!valid) {
			return fail(400, { error: 'Invalid email or password.', email });
		}

		const { id: sessionId, expiresAt } = await createSession(user.id);
		setSessionCookie(event, sessionId, expiresAt);

		throw redirect(302, '/');
	}
};
