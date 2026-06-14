import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, users, transactions } from '$lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/home');

	let openBounties = 0;
	let verifiedScouts = 0;
	let totalPaidOut = 0;
	let liveBounties: {
		id: string;
		title: string;
		brand: string;
		placeName: string | null;
		radiusMiles: number;
		rewardUsdc: number;
		claimCount: number;
		maxClaims: number;
	}[] = [];
	try {
		const [b] = await db.select({ count: sql<number>`count(*)` }).from(bounties).where(eq(bounties.status, 'open'));
		openBounties = Number(b?.count ?? 0);

		const [u] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.worldIdVerified, true));
		verifiedScouts = Number(u?.count ?? 0);

		const [p] = await db
			.select({ total: sql<number>`coalesce(sum(${transactions.amountUsdc}), 0)` })
			.from(transactions)
			.where(eq(transactions.type, 'bounty_payout'));
		totalPaidOut = Number(p?.total ?? 0);

		const rows = await db
			.select({
				id: bounties.id,
				title: bounties.title,
				placeName: bounties.placeName,
				radiusMiles: bounties.radiusMiles,
				rewardUsdc: bounties.rewardUsdc,
				maxClaims: bounties.maxClaims,
				claimCount: bounties.claimCount,
				brand: sql<string>`coalesce(${users.businessName}, ${users.displayName})`,
			})
			.from(bounties)
			.innerJoin(users, eq(bounties.creatorId, users.id))
			.where(eq(bounties.status, 'open'))
			.orderBy(desc(bounties.createdAt))
			.limit(4);

		liveBounties = rows.map((r) => ({ ...r, radiusMiles: Number(r.radiusMiles), rewardUsdc: Number(r.rewardUsdc) }));
	} catch {
		// DB not connected yet — landing page still renders with zeroed stats.
	}

	return { stats: { openBounties, verifiedScouts, totalPaidOut }, liveBounties };
};
