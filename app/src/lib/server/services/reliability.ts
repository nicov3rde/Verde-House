/**
 * Reliability Score + category expertise, computed from real DB signals
 * (posts, verified visits, World ID, bounty claims). No external calls —
 * always "live", nothing here is a stub.
 *
 * See app/README.md "Reliability & Expertise Scores" for the documented
 * formula shown to users.
 */

export type ExpertiseCategory = 'pizza' | 'coffee' | 'nightlife';

const CATEGORY_KEYWORDS: Record<ExpertiseCategory, string[]> = {
	pizza: ['pizza', 'pizzeria', 'slice'],
	coffee: ['coffee', 'café', 'cafe', 'espresso', 'latte', 'roaster', 'roastery'],
	nightlife: ['bar', 'club', 'lounge', 'pub', 'nightclub', 'brewery', 'taproom', 'speakeasy'],
};

export type ExpertisePost = {
	placeName: string | null;
	caption: string | null;
	verifiedVisit: boolean;
	likeCount: number;
	commentCount: number;
	saveCount: number;
};

function matchesCategory(post: ExpertisePost, category: ExpertiseCategory): boolean {
	const haystack = `${post.placeName ?? ''} ${post.caption ?? ''}`.toLowerCase();
	return CATEGORY_KEYWORDS[category].some((kw) => haystack.includes(kw));
}

/**
 * Category score (0-100): +20 per verified-visit post matching the category's
 * keywords, +5 per unverified matching post, plus up to +20 for engagement
 * (likes + comments + saves) on those posts. Capped at 100.
 */
function categoryScore(posts: ExpertisePost[], category: ExpertiseCategory): number {
	const matches = posts.filter((p) => matchesCategory(p, category));
	if (matches.length === 0) return 0;

	let score = 0;
	for (const post of matches) {
		score += post.verifiedVisit ? 20 : 5;
	}

	const engagement = matches.reduce((sum, p) => sum + p.likeCount + p.commentCount + p.saveCount, 0);
	score += Math.min(engagement, 20);

	return Math.min(100, score);
}

export interface ExpertiseScores {
	pizza: number;
	coffee: number;
	nightlife: number;
	localTrust: number;
}

/**
 * Pizza/Coffee/Nightlife (0-100, see categoryScore) plus Local Trust:
 * the percentage of the user's posts marked as a verified visit.
 */
export function computeExpertise(posts: ExpertisePost[]): ExpertiseScores {
	const localTrust = posts.length > 0 ? Math.round((posts.filter((p) => p.verifiedVisit).length / posts.length) * 100) : 0;

	return {
		pizza: categoryScore(posts, 'pizza'),
		coffee: categoryScore(posts, 'coffee'),
		nightlife: categoryScore(posts, 'nightlife'),
		localTrust,
	};
}

export type ReliabilityUser = {
	worldIdVerified: boolean;
	createdAt: Date;
};

export type ReliabilityClaim = {
	status: 'pending' | 'verified' | 'paid' | 'rejected';
};

export interface ReliabilityScore {
	total: number;
	breakdown: {
		worldId: number;
		accountAge: number;
		verifiedVisits: number;
		bountiesPaid: number;
	};
}

/**
 * Overall Reliability Score (0-100):
 *  - World ID verified: +25
 *  - Account age: +1 per 7 days, capped at +20 (~140 days for the full amount)
 *  - Verified visits: +5 per verified-visit post, capped at +30
 *  - Paid bounty claims: +10 per paid claim, capped at +25
 */
export function computeReliabilityScore(user: ReliabilityUser, posts: ExpertisePost[], claims: ReliabilityClaim[]): ReliabilityScore {
	const worldId = user.worldIdVerified ? 25 : 0;

	const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);
	const accountAge = Math.min(20, Math.floor(ageDays / 7));

	const verifiedVisitCount = posts.filter((p) => p.verifiedVisit).length;
	const verifiedVisits = Math.min(30, verifiedVisitCount * 5);

	const paidClaimCount = claims.filter((c) => c.status === 'paid').length;
	const bountiesPaid = Math.min(25, paidClaimCount * 10);

	return {
		total: Math.min(100, worldId + accountAge + verifiedVisits + bountiesPaid),
		breakdown: { worldId, accountAge, verifiedVisits, bountiesPaid },
	};
}
