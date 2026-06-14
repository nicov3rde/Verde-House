import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { bounties, users } from '$lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { agentJson, agentOptions } from '$lib/server/agent';

const STATUSES = ['pending_payment', 'open', 'closed'] as const;
type BountyStatus = (typeof STATUSES)[number];

export const OPTIONS = agentOptions;

export const GET: RequestHandler = async ({ url }) => {
	const statusParam = url.searchParams.get('status');
	const status: BountyStatus = STATUSES.includes(statusParam as BountyStatus) ? (statusParam as BountyStatus) : 'open';
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);

	// Default view (no explicit status) is "what can an agent fulfill right
	// now" — open campaigns that are still active.
	const where = statusParam
		? eq(bounties.status, status)
		: and(eq(bounties.status, status), eq(bounties.active, true));

	const rows = await db
		.select({
			id: bounties.id,
			title: bounties.title,
			description: bounties.description,
			placeName: bounties.placeName,
			placeAddress: bounties.placeAddress,
			lat: bounties.lat,
			lng: bounties.lng,
			radiusMiles: bounties.radiusMiles,
			rewardUsdc: bounties.rewardUsdc,
			maxClaims: bounties.maxClaims,
			claimCount: bounties.claimCount,
			status: bounties.status,
			active: bounties.active,
			expiresAt: bounties.expiresAt,
			createdAt: bounties.createdAt,
			brand: sql<string>`coalesce(${users.businessName}, ${users.displayName})`,
			brandIsAgent: users.isAgent,
		})
		.from(bounties)
		.innerJoin(users, eq(bounties.creatorId, users.id))
		.where(where)
		.orderBy(desc(bounties.createdAt))
		.limit(limit);

	return agentJson({
		bounties: rows.map((b) => ({
			...b,
			radiusMiles: Number(b.radiusMiles),
			rewardUsdc: Number(b.rewardUsdc),
		})),
	});
};
