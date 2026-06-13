import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts, bounties, bountyClaims } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { distanceMiles } from '$lib/server/services/geo';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { caption, imageUrl, videoUrl, placeName, bountyClaimId, lat, lng } = await request.json();

	const trimmedCaption = (caption ?? '').trim();
	const trimmedImageUrl = (imageUrl ?? '').trim();
	const trimmedVideoUrl = (videoUrl ?? '').trim();
	let trimmedPlaceName = (placeName ?? '').trim();
	const postLat = typeof lat === 'number' ? lat : null;
	const postLng = typeof lng === 'number' ? lng : null;

	if (!trimmedCaption && !trimmedImageUrl && !trimmedVideoUrl) {
		throw error(400, 'Post must have a caption, image, or video');
	}

	let claim: typeof bountyClaims.$inferSelect | undefined;
	let verifiedVisit = false;

	if (bountyClaimId) {
		[claim] = await db
			.select()
			.from(bountyClaims)
			.where(and(eq(bountyClaims.id, bountyClaimId), eq(bountyClaims.userId, locals.user.id)))
			.limit(1);

		if (!claim) throw error(404, 'Bounty claim not found');
		if (claim.fulfillmentPostId) throw error(400, 'This bounty claim already has a fulfillment post');

		const [bounty] = await db.select().from(bounties).where(eq(bounties.id, claim.bountyId)).limit(1);

		if (!trimmedPlaceName) {
			trimmedPlaceName = bounty?.placeName ?? '';
		}

		// Geo/time match: a submission is a "verified visit" when the poster's
		// shared coordinates fall within the bounty's geo-fence and the bounty
		// is still active (i.e. within its claim window).
		if (bounty && postLat != null && postLng != null && bounty.lat != null && bounty.lng != null) {
			const withinRadius = distanceMiles(postLat, postLng, bounty.lat, bounty.lng) <= bounty.radiusMiles;
			const withinWindow = bounty.active && (!bounty.expiresAt || new Date() <= bounty.expiresAt);
			verifiedVisit = withinRadius && withinWindow;
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
			lat: postLat,
			lng: postLng,
			verifiedVisit,
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
