import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { users, bounties, bountyClaims } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { isDeveloper } from '$lib/server/admin';
import { seedDemoData, resetDemoData } from '$lib/server/seed';
import { resolveClaim } from '$lib/server/claims';
import { worldId, ens, unlink, arc } from '$lib/server/services';
import { stripe } from '$lib/server/services/stripe';
import { media } from '$lib/server/services/media';
import { sui } from '$lib/server/services/sui';
import { verification } from '$lib/server/services/verification';

function requireDeveloper(locals: App.Locals) {
	if (!locals.user) throw redirect(302, '/auth/login');
	if (!isDeveloper(locals.user)) throw error(403, 'Developer access only');
}

export const load: PageServerLoad = async ({ locals }) => {
	requireDeveloper(locals);

	const agents = await db
		.select({
			id: users.id,
			handle: users.handle,
			displayName: users.displayName,
			active: users.active,
			worldIdVerified: users.worldIdVerified,
			ensName: users.ensName,
		})
		.from(users)
		.where(eq(users.isAgent, true))
		.orderBy(users.handle);

	const pendingClaims = await db
		.select({
			id: bountyClaims.id,
			bountyId: bountyClaims.bountyId,
			bountyTitle: bounties.title,
			rewardUsdc: bounties.rewardUsdc,
			claimantHandle: users.handle,
			claimantDisplayName: users.displayName,
			fulfillmentPostId: bountyClaims.fulfillmentPostId,
			acceptedAt: bountyClaims.acceptedAt,
		})
		.from(bountyClaims)
		.innerJoin(bounties, eq(bountyClaims.bountyId, bounties.id))
		.innerJoin(users, eq(bountyClaims.userId, users.id))
		.where(eq(bountyClaims.status, 'pending'))
		.orderBy(desc(bountyClaims.acceptedAt));

	const serviceStatus = [
		{ key: 'stripe', name: 'Stripe', mode: stripe.mode, detail: stripe.mode === 'live' ? 'STRIPE_SECRET_KEY set' : 'STRIPE_SECRET_KEY not set' },
		{
			key: 'storage',
			name: 'Media Storage',
			mode: media.mode,
			detail: media.mode === 'live' ? `backend: ${media.backend}` : 'writes to static/uploads (dev only)',
		},
		{ key: 'sui', name: 'Sui (receipts)', mode: sui.mode, detail: sui.mode === 'live' ? 'SUI_RPC_URL set' : 'SUI_RPC_URL not set — hashes computed, not anchored' },
		{ key: 'worldId', name: 'World ID', mode: worldId.mode, detail: worldId.mode === 'live' ? 'WORLD_ID_APP_ID set' : 'WORLD_ID_APP_ID not set' },
		{ key: 'ens', name: 'ENS', mode: ens.mode, detail: ens.mode === 'live' ? 'ETH_RPC_URL set' : 'ETH_RPC_URL not set' },
		{ key: 'unlink', name: 'Unlink', mode: unlink.mode, detail: unlink.mode === 'live' ? 'UNLINK_API_KEY set' : 'UNLINK_API_KEY not set' },
		{ key: 'arc', name: 'Arc', mode: arc.mode, detail: arc.mode === 'live' ? 'ARC_RPC_URL set' : 'ARC_RPC_URL not set' },
		{ key: 'verification', name: 'Agent verification', mode: verification.mode, detail: 'External engagement metrics are always stubbed (no social-listening API configured)' },
	] as const;

	return { agents, pendingClaims, serviceStatus };
};

export const actions: Actions = {
	seed: async ({ locals }) => {
		requireDeveloper(locals);
		const result = await seedDemoData();
		return { panel: 'seed' as const, ...result };
	},

	resetSeed: async ({ locals }) => {
		requireDeveloper(locals);
		const result = await resetDemoData();
		return { panel: 'seed' as const, ...result };
	},

	toggleAgentActive: async ({ locals, request }) => {
		requireDeveloper(locals);
		const data = await request.formData();
		const userId = data.get('userId') as string;
		if (!userId) return fail(400, { panel: 'agents' as const, error: 'Missing userId' });

		const [agent] = await db.select({ active: users.active, isAgent: users.isAgent }).from(users).where(eq(users.id, userId)).limit(1);
		if (!agent || !agent.isAgent) return fail(404, { panel: 'agents' as const, error: 'Agent not found' });

		await db.update(users).set({ active: !agent.active }).where(eq(users.id, userId));
		return { panel: 'agents' as const, success: true };
	},

	forceVerify: async ({ locals, request }) => {
		requireDeveloper(locals);
		const data = await request.formData();
		const claimId = data.get('claimId') as string;
		const action = (data.get('decision') as string) === 'reject' ? 'reject' : 'verify';
		if (!claimId) return fail(400, { panel: 'claims' as const, error: 'Missing claimId' });

		const [claim] = await db.select({ status: bountyClaims.status }).from(bountyClaims).where(eq(bountyClaims.id, claimId)).limit(1);
		if (!claim) return fail(404, { panel: 'claims' as const, error: 'Claim not found' });
		if (claim.status !== 'pending') return fail(400, { panel: 'claims' as const, error: 'Claim already reviewed' });

		const result = await resolveClaim(claimId, action, locals.user!.id);
		return {
			panel: 'claims' as const,
			success: true,
			status: result.status,
			arcSettlementHash: result.status === 'paid' ? result.settlement.hash : null,
			arcMode: result.status === 'paid' ? result.settlement.mode : null,
		};
	},
};
