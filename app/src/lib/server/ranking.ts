import { db } from '$lib/db';
import { users, posts, bountyClaims, postRanks, vouches } from '$lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { computeAuthorityScore } from './services/reliability';

/**
 * Recomputes and persists `users.authority_score` for one user from their
 * live post-rank and vouch totals. Call after any mutation that touches
 * `post_ranks` or `vouches` for the affected user(s).
 */
export async function recomputeAuthorityScore(userId: string): Promise<void> {
	const [postRankRow] = await db
		.select({ sum: sql<number>`coalesce(sum(${posts.rankScore}), 0)` })
		.from(posts)
		.where(eq(posts.authorId, userId));

	const [vouchesReceivedRow] = await db
		.select({ sum: sql<number>`coalesce(sum(${bountyClaims.vouchCount}), 0)` })
		.from(bountyClaims)
		.where(eq(bountyClaims.userId, userId));

	const [vouchesGivenRow] = await db
		.select({ count: sql<number>`count(*)` })
		.from(vouches)
		.where(eq(vouches.voucherId, userId));

	const score = computeAuthorityScore({
		postRankSum: Number(postRankRow?.sum ?? 0),
		vouchesReceived: Number(vouchesReceivedRow?.sum ?? 0),
		vouchesGiven: Number(vouchesGivenRow?.count ?? 0),
	});

	await db.update(users).set({ authorityScore: score.total }).where(eq(users.id, userId));
}

/** This user's votes (+1/-1) on a set of posts, keyed by post id. */
export async function getUserPostRanks(userId: string, postIds: string[]): Promise<Map<string, number>> {
	if (postIds.length === 0) return new Map();

	const rows = await db
		.select({ postId: postRanks.postId, value: postRanks.value })
		.from(postRanks)
		.where(and(eq(postRanks.userId, userId), inArray(postRanks.postId, postIds)));

	return new Map(rows.map((r) => [r.postId, r.value]));
}

/** Bounty claim ids (from `claimIds`) this user has already vouched for. */
export async function getUserVouches(userId: string, claimIds: string[]): Promise<Set<string>> {
	if (claimIds.length === 0) return new Set();

	const rows = await db
		.select({ claimId: vouches.claimId })
		.from(vouches)
		.where(and(eq(vouches.voucherId, userId), inArray(vouches.claimId, claimIds)));

	return new Set(rows.map((r) => r.claimId));
}
