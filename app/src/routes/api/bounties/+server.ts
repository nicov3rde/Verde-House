import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { payments } from '$lib/server/services/payments';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body = await request.json();
	const title = String(body.title ?? '').trim();
	const description = String(body.description ?? '').trim();
	const brand = String(body.brand ?? '').trim();
	const placeName = String(body.placeName ?? '').trim();
	const radiusMiles = Number(body.radiusMiles);
	const rewardUsdc = Number(body.rewardUsdc);
	const maxClaims = Number(body.maxClaims);

	if (!title || !description) {
		throw error(400, 'Title and verification criteria are required');
	}
	if (!Number.isFinite(rewardUsdc) || rewardUsdc <= 0) {
		throw error(400, 'Payout per claim must be greater than 0');
	}
	if (!Number.isFinite(maxClaims) || maxClaims < 1) {
		throw error(400, 'Claim cap must be at least 1');
	}

	const currentBrand = locals.user.businessName ?? locals.user.displayName;
	if (brand && brand !== currentBrand) {
		await db.update(users).set({ businessName: brand }).where(eq(users.id, locals.user.id));
	}

	const [bounty] = await db
		.insert(bounties)
		.values({
			creatorId: locals.user.id,
			title,
			description,
			placeName: placeName || null,
			radiusMiles: Number.isFinite(radiusMiles) && radiusMiles > 0 ? radiusMiles : 2,
			rewardUsdc,
			maxClaims,
			status: 'pending_payment',
			active: false,
		})
		.returning();

	const escrow = await payments.startEscrow({
		bountyId: bounty.id,
		businessId: locals.user.id,
		amountUsdc: rewardUsdc * maxClaims,
	});

	return json({
		bountyId: bounty.id,
		mode: escrow.mode,
		clientSecret: escrow.clientSecret,
	});
};
