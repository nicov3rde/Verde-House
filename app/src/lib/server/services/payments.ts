import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { bounties, bountyClaims, transactions } from '$lib/db/schema';
import { stripe } from './stripe';

export const payments = {
	mode: stripe.mode,

	/**
	 * Starts escrow for a new bounty (total = rewardUsdc * maxClaims). Live
	 * mode creates a real Stripe PaymentIntent for the business to pay via the
	 * Payment Element; confirmEscrow() then runs from the webhook on
	 * payment_intent.succeeded. Stub mode simulates an instant successful
	 * deposit so bounties open immediately without a configured Stripe account.
	 */
	async startEscrow(opts: { bountyId: string; businessId: string; amountUsdc: number }) {
		const { bountyId, businessId, amountUsdc } = opts;

		if (stripe.mode === 'live' && stripe.client) {
			const intent = await stripe.client.paymentIntents.create({
				amount: Math.round(amountUsdc * 100),
				currency: 'usd',
				metadata: { bountyId, businessId, kind: 'bounty_escrow' },
			});
			await db
				.update(bounties)
				.set({ stripePaymentIntentId: intent.id })
				.where(eq(bounties.id, bountyId));
			return { mode: 'live' as const, paymentIntentId: intent.id, clientSecret: intent.client_secret };
		}

		const paymentIntentId = `stub_pi_${randomUUID()}`;
		await payments.confirmEscrow({ bountyId, businessId, amountUsdc, paymentIntentId });
		return { mode: 'stub' as const, paymentIntentId, clientSecret: null };
	},

	/**
	 * Marks a bounty as funded + open and records the deposit. Called either
	 * immediately (stub mode) or from the Stripe webhook (live mode).
	 */
	async confirmEscrow(opts: { bountyId: string; businessId: string; amountUsdc: number; paymentIntentId: string }) {
		const { bountyId, businessId, amountUsdc, paymentIntentId } = opts;
		await db
			.update(bounties)
			.set({ status: 'open', active: true, stripePaymentIntentId: paymentIntentId })
			.where(eq(bounties.id, bountyId));
		await db.insert(transactions).values({
			userId: businessId,
			type: 'business_deposit',
			amountUsdc,
			private: false,
			stripePaymentIntentId: paymentIntentId,
		});
	},

	/**
	 * Releases a bounty payout to a claimant. Always simulated for now — the
	 * real Unlink/Arc settlement layer can replace this stub without changing
	 * call sites.
	 */
	async releasePayout(opts: { claimId: string; userId: string; amountUsdc: number; private: boolean }) {
		const { claimId, userId, amountUsdc, private: isPrivate } = opts;
		const txHash = `stub_tx_${randomUUID()}`;
		await db
			.update(bountyClaims)
			.set({ status: 'paid', payoutTxHash: txHash, paidAt: new Date() })
			.where(eq(bountyClaims.id, claimId));
		await db.insert(transactions).values({
			userId,
			type: 'bounty_payout',
			amountUsdc,
			private: isPrivate,
			txHash,
		});
		return { mode: 'stub' as const, txHash };
	},
};
