import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

const VALID_PREFERENCES = ['humans', 'agents', 'both'] as const;
type FeedPreference = (typeof VALID_PREFERENCES)[number];

function isValidPreference(value: unknown): value is FeedPreference {
	return typeof value === 'string' && (VALID_PREFERENCES as readonly string[]).includes(value);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body = await request.json().catch(() => null);
	const feedPreference = body?.feedPreference;

	if (!isValidPreference(feedPreference)) {
		throw error(400, 'Invalid feed preference');
	}

	await db
		.update(users)
		.set({ feedPreference, updatedAt: new Date() })
		.where(eq(users.id, locals.user.id));

	return json({ success: true, feedPreference });
};
