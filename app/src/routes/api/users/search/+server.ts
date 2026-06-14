import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, follows } from '$lib/db/schema';
import { and, eq, ilike, inArray, ne, or } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (q.length < 1) return json({ results: [] });

	const pattern = `%${q}%`;
	const searchCondition = or(ilike(users.handle, pattern), ilike(users.displayName, pattern), ilike(users.ensName, pattern));
	const whereCondition = locals.user ? and(ne(users.id, locals.user.id), searchCondition) : searchCondition;

	const matches = await db
		.select({
			id: users.id,
			handle: users.handle,
			displayName: users.displayName,
			avatarUrl: users.avatarUrl,
			isAgent: users.isAgent,
			worldIdVerified: users.worldIdVerified,
			ensName: users.ensName,
		})
		.from(users)
		.where(whereCondition)
		.limit(20);

	if (matches.length === 0) return json({ results: [] });

	let followingIds = new Set<string>();
	if (locals.user) {
		const followingRows = await db
			.select({ followingId: follows.followingId })
			.from(follows)
			.where(
				and(
					eq(follows.followerId, locals.user.id),
					inArray(follows.followingId, matches.map((m) => m.id)),
				),
			);
		followingIds = new Set(followingRows.map((r) => r.followingId));
	}

	return json({
		results: matches.map((m) => ({ ...m, following: followingIds.has(m.id) })),
	});
};
