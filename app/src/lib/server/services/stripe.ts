import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';

const mode: ServiceMode = env.STRIPE_SECRET_KEY ? 'live' : 'stub';

export const stripe = {
	mode,

	/** Real Stripe client, or null in stub mode (no secret key configured). */
	client: env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null,

	publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
	webhookSecret: env.STRIPE_WEBHOOK_SECRET || null,
};
