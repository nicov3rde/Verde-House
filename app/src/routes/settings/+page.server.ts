import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { worldId, ens } from '$lib/server/services';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

	const { passwordHash, ...safeUser } = locals.user;
	return {
		user: safeUser,
		worldId: worldId.getStatus(locals.user),
		ens: { name: ens.getName(locals.user), mode: ens.mode },
	};
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

	togglePrivacy: async ({ locals }) => {
		if (!locals.user) return fail(401, { section: 'privacy', error: 'Unauthorized', success: undefined });

		await db
			.update(users)
			.set({ earningsPrivate: !locals.user.earningsPrivate, updatedAt: new Date() })
			.where(eq(users.id, locals.user.id));

		return { section: 'privacy', error: undefined, success: true };
	},

	connectEns: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { section: 'ens', error: 'Unauthorized', success: undefined });

		const data = await request.formData();
		const ensName = (data.get('ensName') as string)?.trim().toLowerCase();

		if (!ensName) return fail(400, { section: 'ens', error: 'Enter an ENS name.', success: undefined });
		if (!/^[a-z0-9-]+\.eth$/.test(ensName)) {
			return fail(400, { section: 'ens', error: 'Enter a valid .eth name (e.g. yourname.eth).', success: undefined });
		}

		await db.update(users).set({ ensName, updatedAt: new Date() }).where(eq(users.id, locals.user.id));

		return { section: 'ens', error: undefined, success: true };
	},

	disconnectEns: async ({ locals }) => {
		if (!locals.user) return fail(401, { section: 'ens', error: 'Unauthorized', success: undefined });

		await db.update(users).set({ ensName: null, updatedAt: new Date() }).where(eq(users.id, locals.user.id));

		return { section: 'ens', error: undefined, success: true };
	},
};
