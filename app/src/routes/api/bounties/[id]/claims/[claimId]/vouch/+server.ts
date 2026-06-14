import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bountyClaims, vouches } from '$lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { recomputeAuthorityScore } from '$lib/server/ranking';

/**
 * Peer Ranking Engine: vouch for a pending bounty claim, staking the
 * voucher's own Authority Score on it being legitimate ahead of
 * agent/creator review. One vouch per user per claim.
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const [claim] = await db.select().from(bountyClaims).where(eq(bountyClaims.id, params.claimId)).limit(1);
	if (!claim || claim.bountyId !== params.id) throw error(404, 'Claim not found');
	if (claim.status !== 'pending') throw error(400, 'Only pending claims can be vouched for');
	if (claim.userId === locals.user.id) throw error(400, 'You cannot vouch for your own claim');

	const [existing] = await db
		.select()
		.from(vouches)
		.where(and(eq(vouches.voucherId, locals.user.id), eq(vouches.claimId, claim.id)))
		.limit(1);

	if (!existing) {
		await db.insert(vouches).values({ voucherId: locals.user.id, claimId: claim.id });
		await db
			.update(bountyClaims)
			.set({ vouchCount: sql`${bountyClaims.vouchCount} + 1` })
			.where(eq(bountyClaims.id, claim.id));

		await Promise.all([recomputeAuthorityScore(claim.userId), recomputeAuthorityScore(locals.user.id)]);
	}

	const [updated] = await db.select({ vouchCount: bountyClaims.vouchCount }).from(bountyClaims).where(eq(bountyClaims.id, claim.id)).limit(1);
	return json({ vouchCount: updated.vouchCount, vouched: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const [claim] = await db.select().from(bountyClaims).where(eq(bountyClaims.id, params.claimId)).limit(1);
	if (!claim || claim.bountyId !== params.id) throw error(404, 'Claim not found');

	const deleted = await db
		.delete(vouches)
		.where(and(eq(vouches.voucherId, locals.user.id), eq(vouches.claimId, claim.id)))
		.returning();

	if (deleted.length > 0) {
		await db
			.update(bountyClaims)
			.set({ vouchCount: sql`greatest(${bountyClaims.vouchCount} - 1, 0)` })
			.where(eq(bountyClaims.id, claim.id));

		await Promise.all([recomputeAuthorityScore(claim.userId), recomputeAuthorityScore(locals.user.id)]);
	}

	const [updated] = await db.select({ vouchCount: bountyClaims.vouchCount }).from(bountyClaims).where(eq(bountyClaims.id, claim.id)).limit(1);
	return json({ vouchCount: updated.vouchCount, vouched: false });
};
