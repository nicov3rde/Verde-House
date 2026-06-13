import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const { passwordHash, ...safeUser } = locals.user;
	return { user: safeUser };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { section: 'profile', error: 'Unauthorized', success: undefined });

		const data = await request.formData();
		const displayName = (data.get('displayName') as string)?.trim();
		const bio = (data.get('bio') as string)?.trim() ?? '';
		const avatarUrl = (data.get('avatarUrl') as string)?.trim() ?? '';

		if (!displayName) {
			return fail(400, { section: 'profile', error: 'Display name is required.', success: undefined });
		}

		await db
			.update(users)
			.set({ displayName, bio, avatarUrl, updatedAt: new Date() })
			.where(eq(users.id, locals.user.id));

		return { section: 'profile', error: undefined, success: true };
	},

	updateFeedPreference: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { section: 'feed', error: 'Unauthorized', success: undefined });

		const data = await request.formData();
		const feedPreference = data.get('feedPreference') as string;

		if (!['humans', 'agents', 'both'].includes(feedPreference)) {
			return fail(400, { section: 'feed', error: 'Invalid feed preference.', success: undefined });
		}

		await db
			.update(users)
			.set({ feedPreference: feedPreference as 'humans' | 'agents' | 'both', updatedAt: new Date() })
			.where(eq(users.id, locals.user.id));

		return { section: 'feed', error: undefined, success: true };
	},
};
