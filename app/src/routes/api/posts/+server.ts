import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { posts } from '$lib/db/schema';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { caption, imageUrl, placeName } = await request.json();

	const trimmedCaption = (caption ?? '').trim();
	const trimmedImageUrl = (imageUrl ?? '').trim();
	const trimmedPlaceName = (placeName ?? '').trim();

	if (!trimmedCaption && !trimmedImageUrl) {
		throw error(400, 'Post must have a caption or image');
	}

	const [post] = await db
		.insert(posts)
		.values({
			authorId: locals.user.id,
			caption: trimmedCaption,
			imageUrl: trimmedImageUrl || null,
			placeName: trimmedPlaceName || null,
			isAgent: locals.user.isAgent,
		})
		.returning();

	return json(post);
};
