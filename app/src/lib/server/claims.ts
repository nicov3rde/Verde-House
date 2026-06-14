import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, bountyClaims, users, notifications, posts } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { payments } from './services/payments';
import { verification } from './services/verification';
import { sui, type AnchorReceipt } from './services/sui';
import { arc, type SettlementReceipt } from './services/arc';

export type ClaimAction = 'verify' | 'reject';
export type ClaimResolution =
	| { status: 'rejected'; receipt: AnchorReceipt }
	| { status: 'paid'; receipt: AnchorReceipt; settlement: SettlementReceipt };

/**
 * Runs the agent verification check on a pending claim's fulfillment post,
 * anchors an immutable receipt of the result on Sui, then verifies/rejects
 * the claim and (on verify) releases the bounty payout and records its Arc
 * L1 USDC settlement. Shared by the bounty creator's review endpoint and the
 * developer panel's force-verify action — callers are responsible for their
 * own authorization checks.
 */
export async function resolveClaim(claimId: string, action: ClaimAction, reviewerId: string): Promise<ClaimResolution> {
	const [claim] = await db.select().from(bountyClaims).where(eq(bountyClaims.id, claimId)).limit(1);
	if (!claim) throw error(404, 'Claim not found');
	if (claim.status !== 'pending') throw error(400, 'Claim has already been reviewed');
	if (!claim.fulfillmentPostId) throw error(400, 'This claim has no fulfillment post yet');

	const [bounty] = await db.select().from(bounties).where(eq(bounties.id, claim.bountyId)).limit(1);
	if (!bounty) throw error(404, 'Bounty not found');

	const [fulfillmentPost] = await db.select().from(posts).where(eq(posts.id, claim.fulfillmentPostId)).limit(1);
	if (!fulfillmentPost) throw error(404, 'Fulfillment post not found');

	const agentCheck = await verification.checkClaim(fulfillmentPost);

	const receipt = await sui.anchorReceipt({
		claimId: claim.id,
		bountyId: bounty.id,
		postId: fulfillmentPost.id,
		action,
		verified: agentCheck.verified,
		reviewerId,
		at: new Date().toISOString(),
	});

	if (action === 'reject') {
		await db
			.update(bountyClaims)
			.set({
				status: 'rejected',
				verifiedAt: new Date(),
				agentVerified: agentCheck.verified,
				agentNotes: agentCheck.notes,
				receiptHash: receipt.hash,
				receiptTxDigest: receipt.txDigest,
			})
			.where(eq(bountyClaims.id, claim.id));

		await db.insert(notifications).values({
			recipientId: claim.userId,
			actorId: reviewerId,
			type: 'bounty_rejected',
			message: `Your submission for "${bounty.title}" was not approved.`,
		});

		return { status: 'rejected', receipt };
	}

	await db
		.update(bountyClaims)
		.set({
			status: 'verified',
			verifiedAt: new Date(),
			agentVerified: agentCheck.verified,
			agentNotes: agentCheck.notes,
			receiptHash: receipt.hash,
			receiptTxDigest: receipt.txDigest,
		})
		.where(eq(bountyClaims.id, claim.id));

	const [claimant] = await db.select().from(users).where(eq(users.id, claim.userId)).limit(1);

	await payments.releasePayout({
		claimId: claim.id,
		userId: claim.userId,
		amountUsdc: bounty.rewardUsdc,
		private: claimant?.earningsPrivate ?? true,
	});

	const settlement = await arc.processSettlement({
		claimId: claim.id,
		bountyId: bounty.id,
		userId: claim.userId,
		amountUsdc: bounty.rewardUsdc,
		private: claimant?.earningsPrivate ?? true,
		at: new Date().toISOString(),
	});

	await db
		.update(bountyClaims)
		.set({
			arcSettlementHash: settlement.hash,
			arcTxHash: settlement.txHash,
		})
		.where(eq(bountyClaims.id, claim.id));

	await db.insert(notifications).values({
		recipientId: claim.userId,
		actorId: reviewerId,
		type: 'bounty_paid',
		message: `You were paid $${bounty.rewardUsdc.toFixed(2)} USDC for "${bounty.title}".`,
	});

	return { status: 'paid', receipt, settlement };
}
