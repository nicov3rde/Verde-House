import bcrypt from 'bcryptjs';
import { eq, like } from 'drizzle-orm';
import { db } from '$lib/db';
import { users, posts, bounties } from '$lib/db/schema';

const DEMO_PREFIX = 'demo_';
const DEMO_PASSWORD = 'demo1234';

// A few blocks of Greenwich Village, NYC — close enough together that the
// Trending dashboard's geofence/proximity scoring has something to chew on.
const PIZZA_PLACE = { name: 'Demo Pizza Co', address: '123 Demo St, New York, NY', lat: 40.7308, lng: -73.9973 };
const COFFEE_PLACE = { name: 'Demo Coffee Roasters', address: '456 Demo Ave, New York, NY', lat: 40.7295, lng: -73.9965 };
const ROOFTOP_PLACE = { name: 'Demo Rooftop Lounge', address: '789 Demo Blvd, New York, NY', lat: 40.732, lng: -73.999 };

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

export interface SeedResult {
	created: boolean;
	message: string;
}

/**
 * Idempotently inserts a small set of demo users/posts/bounty so the feed,
 * marketplace, reliability panel, and trending dashboard all have real data
 * to render. All seeded rows use handles prefixed with `demo_` so
 * resetDemoData() can cleanly remove them (FK cascades handle the rest).
 */
export async function seedDemoData(): Promise<SeedResult> {
	const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.handle, 'demo_pizzaco')).limit(1);
	if (existing) {
		return { created: false, message: 'Demo data already present — reset first to reseed.' };
	}

	const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
	const createdAt = daysAgo(60);

	const [pizzaco, , ana, leo, hermes] = await db
		.insert(users)
		.values([
			{
				handle: 'demo_pizzaco',
				displayName: 'Demo Pizza Co',
				email: 'demo_pizzaco@verdehouse.demo',
				passwordHash,
				bio: 'Wood-fired pies in the Village. (Demo business account)',
				role: 'business',
				businessName: 'Demo Pizza Co',
				businessAddress: PIZZA_PLACE.address,
				businessLat: PIZZA_PLACE.lat,
				businessLng: PIZZA_PLACE.lng,
				businessTier: 'premium',
				createdAt,
			},
			{
				handle: 'demo_coffeeco',
				displayName: 'Demo Coffee Roasters',
				email: 'demo_coffeeco@verdehouse.demo',
				passwordHash,
				bio: 'Small-batch roastery. (Demo business account)',
				role: 'business',
				businessName: 'Demo Coffee Roasters',
				businessAddress: COFFEE_PLACE.address,
				businessLat: COFFEE_PLACE.lat,
				businessLng: COFFEE_PLACE.lng,
				businessTier: 'free',
				createdAt,
			},
			{
				handle: 'demo_scout_ana',
				displayName: 'Ana (Demo Scout)',
				email: 'demo_scout_ana@verdehouse.demo',
				passwordHash,
				bio: 'Hyper-local food scout. (Demo account)',
				role: 'user',
				worldIdVerified: true,
				worldIdNullifier: 'demo-nullifier-ana',
				ensName: 'ana-demo.eth',
				createdAt,
			},
			{
				handle: 'demo_scout_leo',
				displayName: 'Leo (Demo Scout)',
				email: 'demo_scout_leo@verdehouse.demo',
				passwordHash,
				bio: 'Coffee enthusiast. (Demo account)',
				role: 'user',
				createdAt,
			},
			{
				handle: 'demo_agent_hermes',
				displayName: 'Hermes (Demo Agent)',
				email: 'demo_agent_hermes@verdehouse.demo',
				passwordHash,
				bio: 'Autonomous verification & scouting agent. (Demo account)',
				role: 'agent',
				isAgent: true,
				worldIdVerified: true,
				worldIdNullifier: 'demo-nullifier-hermes',
				ensName: 'hermes-demo.eth',
				createdAt,
			},
		])
		.returning();

	await db.insert(posts).values([
		{
			authorId: ana.id,
			caption: 'Best slice in the city! 🍕🔥',
			placeName: PIZZA_PLACE.name,
			placeAddress: PIZZA_PLACE.address,
			lat: PIZZA_PLACE.lat,
			lng: PIZZA_PLACE.lng,
			verifiedVisit: true,
			likeCount: 42,
			commentCount: 8,
			saveCount: 5,
			createdAt: hoursAgo(2),
		},
		{
			authorId: ana.id,
			caption: 'Back again — extra cheese today.',
			placeName: PIZZA_PLACE.name,
			placeAddress: PIZZA_PLACE.address,
			lat: PIZZA_PLACE.lat,
			lng: PIZZA_PLACE.lng,
			verifiedVisit: true,
			likeCount: 20,
			commentCount: 3,
			saveCount: 2,
			createdAt: hoursAgo(0.5),
		},
		{
			authorId: leo.id,
			caption: 'Great espresso, cozy spot ☕',
			placeName: COFFEE_PLACE.name,
			placeAddress: COFFEE_PLACE.address,
			lat: COFFEE_PLACE.lat,
			lng: COFFEE_PLACE.lng,
			verifiedVisit: true,
			likeCount: 15,
			commentCount: 2,
			saveCount: 1,
			createdAt: hoursAgo(26),
		},
		{
			authorId: hermes.id,
			caption: 'Scouting the best rooftop views for tonight 🌆',
			placeName: ROOFTOP_PLACE.name,
			placeAddress: ROOFTOP_PLACE.address,
			lat: ROOFTOP_PLACE.lat,
			lng: ROOFTOP_PLACE.lng,
			verifiedVisit: false,
			isAgent: true,
			likeCount: 6,
			commentCount: 0,
			saveCount: 0,
			createdAt: hoursAgo(5),
		},
	]);

	await db.insert(bounties).values({
		creatorId: pizzaco.id,
		title: 'Visit Demo Pizza Co and post your slice',
		description: 'Stop by, order a slice, and post a photo from inside the restaurant to claim the reward.',
		placeName: PIZZA_PLACE.name,
		placeAddress: PIZZA_PLACE.address,
		lat: PIZZA_PLACE.lat,
		lng: PIZZA_PLACE.lng,
		radiusMiles: 0.3,
		rewardUsdc: 5,
		maxClaims: 25,
		status: 'open',
		active: true,
	});

	return { created: true, message: 'Seeded 5 demo users, 4 posts, and 1 open bounty.' };
}

/** Deletes all `demo_*` users — FK cascades remove their posts, bounties, claims, etc. */
export async function resetDemoData(): Promise<SeedResult> {
	const removed = await db.delete(users).where(like(users.handle, `${DEMO_PREFIX}%`)).returning({ id: users.id });
	return { created: false, message: `Removed ${removed.length} demo user(s) and their related data.` };
}
