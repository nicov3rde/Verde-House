import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { bounties, bountyClaims, transactions, users } from '$lib/db/schema';
import { eq, desc, gte, and, inArray, sql } from 'drizzle-orm';
import { stripe } from '$lib/server/services/stripe';
import { payments } from '$lib/server/services/payments';

export const load: PageServerLoad = async ({ locals }) => {
	const feedPref = locals.user?.feedPreference ?? 'both';
	const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	const [totalCampaigns, newThisWeek, verifiedClaims, humanVerifiedClaims, payoutAgg, privatePayoutAgg, ledgerRows] =
		await Promise.all([
			db.select({ count: sql<number>`count(*)` }).from(bounties),
			db.select({ count: sql<number>`count(*)` }).from(bounties).where(gte(bounties.createdAt, oneWeekAgo)),
			db
				.select({ count: sql<number>`count(*)` })
				.from(bountyClaims)
				.where(inArray(bountyClaims.status, ['verified', 'paid'])),
			db
				.select({ count: sql<number>`count(*)` })
				.from(bountyClaims)
				.innerJoin(users, eq(bountyClaims.userId, users.id))
				.where(and(inArray(bountyClaims.status, ['verified', 'paid']), eq(users.isAgent, false))),
			db
				.select({ total: sql<number>`coalesce(sum(${transactions.amountUsdc}), 0)` })
				.from(transactions)
				.where(eq(transactions.type, 'bounty_payout')),
			db
				.select({ total: sql<number>`coalesce(sum(${transactions.amountUsdc}), 0)` })
				.from(transactions)
				.where(and(eq(transactions.type, 'bounty_payout'), eq(transactions.private, true))),
			db
				.select({
					id: bounties.id,
					title: bounties.title,
					placeName: bounties.placeName,
					radiusMiles: bounties.radiusMiles,
					rewardUsdc: bounties.rewardUsdc,
					maxClaims: bounties.maxClaims,
					claimCount: bounties.claimCount,
					status: bounties.status,
					createdAt: bounties.createdAt,
					brand: sql<string>`coalesce(${users.businessName}, ${users.displayName})`,
					creatorIsAgent: users.isAgent,
				})
				.from(bounties)
				.innerJoin(users, eq(bounties.creatorId, users.id))
				.orderBy(desc(bounties.createdAt)),
		]);

	// Filter ledger by audience mode (creator's account type)
	let filteredLedger = ledgerRows;
	if (feedPref === 'humans') filteredLedger = ledgerRows.filter((b) => !b.creatorIsAgent);
	if (feedPref === 'agents') filteredLedger = ledgerRows.filter((b) => b.creatorIsAgent);

	const verifiedCount = Number(verifiedClaims[0]?.count ?? 0);
	const humanCount = Number(humanVerifiedClaims[0]?.count ?? 0);
	const humanRate = verifiedCount > 0 ? Math.round((humanCount / verifiedCount) * 100) : 0;

	const totalPayouts = Number(payoutAgg[0]?.total ?? 0);
	const privatePayouts = Number(privatePayoutAgg[0]?.total ?? 0);
	const privatePayoutPct = totalPayouts > 0 ? Math.round((privatePayouts / totalPayouts) * 100) : 0;

	return {
		stats: {
			totalCampaigns: Number(totalCampaigns[0]?.count ?? 0),
			newThisWeek: Number(newThisWeek[0]?.count ?? 0),
			verifiedSubmissions: verifiedCount,
			humanRate,
			shieldedPayoutsUsdc: totalPayouts,
			privatePayoutPct,
		},
		ledger: filteredLedger.map(({ creatorIsAgent, ...b }) => ({
			...b,
			radiusMiles: Number(b.radiusMiles),
			rewardUsdc: Number(b.rewardUsdc),
		})),
		paymentsMode: payments.mode,
		stripePublishableKey: stripe.publishableKey,
		currentUser: locals.user
			? {
					id: locals.user.id,
					businessName: locals.user.businessName,
					displayName: locals.user.displayName,
				}
			: null,
	};
};
