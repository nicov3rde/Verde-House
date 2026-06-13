import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, bountyClaims } from '$lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const bountyId = params.id;
	const [bounty] = await db.select().from(bounties).where(eq(bounties.id, bountyId)).limit(1);
	if (!bounty) throw error(404, 'Bounty not found');
	if (bounty.status !== 'open' || !bounty.active) throw error(400, 'This bounty is not open for claims');
	if (bounty.claimCount >= bounty.maxClaims) throw error(400, 'This bounty has reached its claim cap');

	const existing = await db
		.select()
		.from(bountyClaims)
		.where(and(eq(bountyClaims.bountyId, bountyId), eq(bountyClaims.userId, locals.user.id)))
		.limit(1);

	if (existing.length > 0) throw error(400, 'You already accepted this bounty');

	const [claim] = await db.insert(bountyClaims).values({ bountyId, userId: locals.user.id }).returning();

	await db
		.update(bounties)
		.set({ claimCount: sql`${bounties.claimCount} + 1` })
		.where(eq(bounties.id, bountyId));

	return json(claim);
};
