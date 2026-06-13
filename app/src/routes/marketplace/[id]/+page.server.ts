import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { bounties, bountyClaims, users, posts } from '$lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login');

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
				createdAt: posts.createdAt,
			},
		})
		.from(bountyClaims)
		.innerJoin(users, eq(bountyClaims.userId, users.id))
		.leftJoin(posts, eq(bountyClaims.fulfillmentPostId, posts.id))
		.where(eq(bountyClaims.bountyId, params.id))
		.orderBy(desc(bountyClaims.acceptedAt));

	const myClaim = claimRows.find((c) => c.user.id === locals.user!.id) ?? null;

	const { passwordHash, email, ...safeUser } = locals.user;

	return {
		bounty: {
			...row.bounty,
			brand: row.brand,
			rewardUsdc: Number(row.bounty.rewardUsdc),
			radiusMiles: Number(row.bounty.radiusMiles),
		},
		claims: claimRows,
		myClaim,
		isCreator: locals.user.id === row.bounty.creatorId,
		user: safeUser,
	};
};
