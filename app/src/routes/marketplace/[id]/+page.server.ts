import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, bountyClaims, users, posts } from '$lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { verification } from '$lib/server/services/verification';
import { getUserVouches } from '$lib/server/ranking';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [row] = await db
		.select({
			bounty: bounties,
			brand: sql<string>`coalesce(${users.businessName}, ${users.displayName})`,
		})
		.from(bounties)
		.innerJoin(users, eq(bounties.creatorId, users.id))
		.where(eq(bounties.id, params.id))
		.limit(1);

	if (!row) throw error(404, 'Bounty not found');

	const claimRows = await db
		.select({
			id: bountyClaims.id,
			status: bountyClaims.status,
			acceptedAt: bountyClaims.acceptedAt,
			verifiedAt: bountyClaims.verifiedAt,
			payoutTxHash: bountyClaims.payoutTxHash,
			fulfillmentPostId: bountyClaims.fulfillmentPostId,
			agentVerified: bountyClaims.agentVerified,
			agentNotes: bountyClaims.agentNotes,
			vouchCount: bountyClaims.vouchCount,
			user: {
				id: users.id,
				handle: users.handle,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				isAgent: users.isAgent,
				worldIdVerified: users.worldIdVerified,
			},
			post: {
				id: posts.id,
				caption: posts.caption,
				imageUrl: posts.imageUrl,
				videoUrl: posts.videoUrl,
				createdAt: posts.createdAt,
				lat: posts.lat,
				lng: posts.lng,
				verifiedVisit: posts.verifiedVisit,
			},
		})
		.from(bountyClaims)
		.innerJoin(users, eq(bountyClaims.userId, users.id))
		.leftJoin(posts, eq(bountyClaims.fulfillmentPostId, posts.id))
		.where(eq(bountyClaims.bountyId, params.id))
		.orderBy(desc(bountyClaims.acceptedAt));

	const myClaim = locals.user ? claimRows.find((c) => c.user.id === locals.user!.id) ?? null : null;
	const isCreator = locals.user ? locals.user.id === row.bounty.creatorId : false;

	// This user's existing vouches, for pending claims that aren't their own.
	let myVouches = new Set<string>();
	if (locals.user) {
		const vouchableIds = claimRows.filter((c) => c.status === 'pending' && c.user.id !== locals.user!.id).map((c) => c.id);
		myVouches = await getUserVouches(locals.user.id, vouchableIds);
	}

	// Give the creator a live preview of the agent verification check before
	// they decide on each pending submission.
	const claims = await Promise.all(
		claimRows.map(async (claim) => {
			const withVouch = { ...claim, vouched: myVouches.has(claim.id) };
			if (isCreator && claim.status === 'pending' && claim.post) {
				const agentCheck = await verification.checkClaim({
					id: claim.post.id,
					lat: claim.post.lat,
					lng: claim.post.lng,
					verifiedVisit: claim.post.verifiedVisit,
					imageUrl: claim.post.imageUrl,
					videoUrl: claim.post.videoUrl,
				});
				return { ...withVouch, agentCheck };
			}
			return { ...withVouch, agentCheck: null };
		}),
	);

	return {
		bounty: {
			...row.bounty,
			brand: row.brand,
			rewardUsdc: Number(row.bounty.rewardUsdc),
			radiusMiles: Number(row.bounty.radiusMiles),
		},
		claims,
		myClaim,
		isCreator,
	};
};
