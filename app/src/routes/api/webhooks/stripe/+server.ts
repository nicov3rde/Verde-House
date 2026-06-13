import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import type Stripe from 'stripe';
import { db } from '$lib/db';
import { bounties } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '$lib/server/services/stripe';
import { payments } from '$lib/server/services/payments';

export const POST: RequestHandler = async ({ request }) => {
	if (!stripe.client || !stripe.webhookSecret) {
		throw error(503, 'Stripe is not configured');
	}

	const payload = await request.text();
	const signature = request.headers.get('stripe-signature');
	if (!signature) throw error(400, 'Missing stripe-signature header');

	let event: Stripe.Event;
	try {
		event = stripe.client.webhooks.constructEvent(payload, signature, stripe.webhookSecret);
	} catch (err) {
		throw error(400, `Invalid signature: ${err instanceof Error ? err.message : 'unknown error'}`);
	}

	if (event.type === 'payment_intent.succeeded') {
		const intent = event.data.object as Stripe.PaymentIntent;
		const { bountyId, businessId, kind } = intent.metadata ?? {};

		if (kind === 'bounty_escrow' && bountyId && businessId) {
			const [bounty] = await db.select().from(bounties).where(eq(bounties.id, bountyId)).limit(1);
			if (bounty && bounty.status === 'pending_payment') {
				await payments.confirmEscrow({
					bountyId,
					businessId,
					amountUsdc: intent.amount / 100,
					paymentIntentId: intent.id,
				});
			}
		}
	}

	return json({ received: true });
};
