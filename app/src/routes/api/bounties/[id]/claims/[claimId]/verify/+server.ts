import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, bountyClaims } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { resolveClaim } from '$lib/server/claims';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { action } = await request.json();
	if (action !== 'verify' && action !== 'reject') throw error(400, 'Invalid action');

	const [bounty] = await db.select().from(bounties).where(eq(bounties.id, params.id)).limit(1);
	if (!bounty) throw error(404, 'Bounty not found');
	if (bounty.creatorId !== locals.user.id) throw error(403, 'Only the bounty creator can verify claims');

	const [claim] = await db.select().from(bountyClaims).where(eq(bountyClaims.id, params.claimId)).limit(1);
	if (!claim || claim.bountyId !== bounty.id) throw error(404, 'Claim not found');

	const result = await resolveClaim(claim.id, action, locals.user.id);
	return json({ status: result.status });
};
