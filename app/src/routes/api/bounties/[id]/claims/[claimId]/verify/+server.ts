import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, bountyClaims, users, notifications, posts } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { payments } from '$lib/server/services/payments';
import { verification } from '$lib/server/services/verification';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { action } = await request.json();
	if (action !== 'verify' && action !== 'reject') throw error(400, 'Invalid action');

	const [bounty] = await db.select().from(bounties).where(eq(bounties.id, params.id)).limit(1);
	if (!bounty) throw error(404, 'Bounty not found');
	if (bounty.creatorId !== locals.user.id) throw error(403, 'Only the bounty creator can verify claims');

	const [claim] = await db.select().from(bountyClaims).where(eq(bountyClaims.id, params.claimId)).limit(1);
	if (!claim || claim.bountyId !== bounty.id) throw error(404, 'Claim not found');
	if (claim.status !== 'pending') throw error(400, 'Claim has already been reviewed');
	if (!claim.fulfillmentPostId) throw error(400, 'This claim has no fulfillment post yet');

	const [fulfillmentPost] = await db.select().from(posts).where(eq(posts.id, claim.fulfillmentPostId)).limit(1);
	if (!fulfillmentPost) throw error(404, 'Fulfillment post not found');

	const agentCheck = await verification.checkClaim(fulfillmentPost);

	if (action === 'reject') {
		await db
			.update(bountyClaims)
			.set({ status: 'rejected', verifiedAt: new Date(), agentVerified: agentCheck.verified, agentNotes: agentCheck.notes })
			.where(eq(bountyClaims.id, claim.id));

		await db.insert(notifications).values({
			recipientId: claim.userId,
			actorId: locals.user.id,
			type: 'bounty_rejected',
			message: `Your submission for "${bounty.title}" was not approved.`,
		});

		return json({ status: 'rejected' });
	}

	await db
		.update(bountyClaims)
		.set({ status: 'verified', verifiedAt: new Date(), agentVerified: agentCheck.verified, agentNotes: agentCheck.notes })
		.where(eq(bountyClaims.id, claim.id));

	const [claimant] = await db.select().from(users).where(eq(users.id, claim.userId)).limit(1);

	await payments.releasePayout({
		claimId: claim.id,
		userId: claim.userId,
		amountUsdc: bounty.rewardUsdc,
		private: claimant?.earningsPrivate ?? true,
	});

	await db.insert(notifications).values({
		recipientId: claim.userId,
		actorId: locals.user.id,
		type: 'bounty_paid',
		message: `You were paid $${bounty.rewardUsdc.toFixed(2)} USDC for "${bounty.title}".`,
	});

	return json({ status: 'paid' });
};
