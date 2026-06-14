import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { posts, users } from '$lib/db/schema';
import { eq, gte, desc } from 'drizzle-orm';
import { distanceMiles } from '$lib/server/services/geo';
import type { PostWithAuthor } from '$lib/types';

const TRENDING_WINDOW_DAYS = 14;
const MAX_PLACES = 20;
// Proximity boost: a place right at the user's location scores ~2x; one 5
// miles away scores ~1x; one 45 miles away scores ~0.2x.
const PROXIMITY_RADIUS_MILES = 5;

function postScore(post: typeof posts.$inferSelect, now: number): number {
	const ageHours = Math.max(0, (now - post.createdAt.getTime()) / 3_600_000);
	const engagement = post.likeCount + post.commentCount * 2 + post.saveCount * 1.5 + 1;
	// Hacker-News-style time decay: recent engagement dominates.
	return engagement / Math.pow(ageHours + 2, 1.5);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const feedPref = locals.user?.feedPreference ?? 'both';
	const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

	const userLat = Number(url.searchParams.get('lat'));
	const userLng = Number(url.searchParams.get('lng'));
	const hasLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

	let recentPosts: PostWithAuthor[] = [];
	try {
		recentPosts = await db
			.select({
				post: posts,
				author: {
					id: users.id,
					handle: users.handle,
					displayName: users.displayName,
					avatarUrl: users.avatarUrl,
					isAgent: users.isAgent,
					worldIdVerified: users.worldIdVerified,
				},
			})
			.from(posts)
			.innerJoin(users, eq(posts.authorId, users.id))
			.where(gte(posts.createdAt, since))
			.orderBy(desc(posts.createdAt))
			.limit(300);
	} catch {
		recentPosts = [];
	}

	// Respect the top-bar Audience Toggle, same filter as Home/Explore.
	let filtered = recentPosts;
	if (feedPref === 'humans') filtered = recentPosts.filter((p) => !p.author.isAgent);
	if (feedPref === 'agents') filtered = recentPosts.filter((p) => p.author.isAgent);

	const now = Date.now();

	type PlaceGroup = {
		placeName: string;
		placeAddress: string | null;
		lat: number | null;
		lng: number | null;
		score: number;
		postCount: number;
		topPost: PostWithAuthor;
		topPostScore: number;
	};

	// Group posts by physical place (placeName) and sum engagement-velocity scores.
	const groups = new Map<string, PlaceGroup>();
	for (const row of filtered) {
		const { post } = row;
		if (!post.placeName) continue;

		const score = postScore(post, now);
		const existing = groups.get(post.placeName);
		if (!existing) {
			groups.set(post.placeName, {
				placeName: post.placeName,
				placeAddress: post.placeAddress,
				lat: post.lat,
				lng: post.lng,
				score,
				postCount: 1,
				topPost: row,
				topPostScore: score,
			});
		} else {
			existing.score += score;
			existing.postCount += 1;
			if (score > existing.topPostScore) {
				existing.topPost = row;
				existing.topPostScore = score;
			}
		}
	}

	// Apply physical geofence proximity (if the client shared its location).
	let places = Array.from(groups.values()).map((g) => {
		const distance = hasLocation && g.lat != null && g.lng != null ? distanceMiles(userLat, userLng, g.lat, g.lng) : null;
		const proximityFactor = distance != null ? PROXIMITY_RADIUS_MILES / (PROXIMITY_RADIUS_MILES + distance) : 1;
		return {
			placeName: g.placeName,
			placeAddress: g.placeAddress,
			lat: g.lat,
			lng: g.lng,
			postCount: g.postCount,
			distance,
			score: g.score * (proximityFactor * 2),
			topPost: { ...g.topPost.post, author: g.topPost.author },
		};
	});

	places.sort((a, b) => b.score - a.score);
	places = places.slice(0, MAX_PLACES);

	return { places, hasLocation, feedPreference: feedPref };
};
