import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts, bounties, bountyClaims } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { caption, imageUrl, videoUrl, placeName, bountyClaimId } = await request.json();

	const trimmedCaption = (caption ?? '').trim();
	const trimmedImageUrl = (imageUrl ?? '').trim();
	const trimmedVideoUrl = (videoUrl ?? '').trim();
	let trimmedPlaceName = (placeName ?? '').trim();

	if (!trimmedCaption && !trimmedImageUrl && !trimmedVideoUrl) {
		throw error(400, 'Post must have a caption, image, or video');
	}

	let claim: typeof bountyClaims.$inferSelect | undefined;

	if (bountyClaimId) {
		[claim] = await db
			.select()
			.from(bountyClaims)
			.where(and(eq(bountyClaims.id, bountyClaimId), eq(bountyClaims.userId, locals.user.id)))
			.limit(1);

		if (!claim) throw error(404, 'Bounty claim not found');
		if (claim.fulfillmentPostId) throw error(400, 'This bounty claim already has a fulfillment post');

		if (!trimmedPlaceName) {
			const [bounty] = await db.select().from(bounties).where(eq(bounties.id, claim.bountyId)).limit(1);
			trimmedPlaceName = bounty?.placeName ?? '';
		}
	}

	const [post] = await db
		.insert(posts)
		.values({
			authorId: locals.user.id,
			caption: trimmedCaption,
			imageUrl: trimmedImageUrl || null,
			videoUrl: trimmedVideoUrl || null,
			placeName: trimmedPlaceName || null,
			isAgent: locals.user.isAgent,
			postType: claim ? 'bounty_fulfillment' : 'organic',
			bountyClaimId: claim ? claim.id : null,
		})
		.returning();

	if (claim) {
		await db.update(bountyClaims).set({ fulfillmentPostId: post.id }).where(eq(bountyClaims.id, claim.id));
	}

	return json(post);
};
