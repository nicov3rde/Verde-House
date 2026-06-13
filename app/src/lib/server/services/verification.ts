import { eq, and, ne } from 'drizzle-orm';
import { db } from '$lib/db';
import { posts } from '$lib/db/schema';
import type { ServiceMode } from './types';

// The geo/time and originality checks below run entirely against our own DB
// (always "real"). External engagement metrics would require a third-party
// social-listening API, which isn't configured, so that piece stays stubbed.
const mode: ServiceMode = 'stub';

export interface ClaimVerificationResult {
	verified: boolean | null;
	notes: string;
	checks: {
		geoTimeMatch: { passed: boolean | null; detail: string };
		originality: { passed: boolean; detail: string };
		externalEngagement: { mode: 'stub'; detail: string };
	};
}

type ClaimPost = {
	id: string;
	lat: number | null;
	lng: number | null;
	verifiedVisit: boolean;
	imageUrl: string | null;
	videoUrl: string | null;
};

export const verification = {
	mode,

	/**
	 * Agent verification for a bounty fulfillment post. Geo/time match reuses
	 * the geo-fence check already run at post-creation (post.verifiedVisit);
	 * originality is a real DB lookup for reused media. Both feed `verified`,
	 * which is advisory only — the business/admin still makes the final call.
	 */
	async checkClaim(post: ClaimPost): Promise<ClaimVerificationResult> {
		const geoTimeMatch: ClaimVerificationResult['checks']['geoTimeMatch'] =
			post.lat == null || post.lng == null
				? { passed: null, detail: 'Submission has no location data — geo-fence could not be checked.' }
				: post.verifiedVisit
					? { passed: true, detail: "Submission location and timestamp match the bounty's geo-fence." }
					: { passed: false, detail: "Submission location or timestamp did not match the bounty's geo-fence." };

		const mediaUrl = post.videoUrl || post.imageUrl;
		let originality: ClaimVerificationResult['checks']['originality'];
		if (!mediaUrl) {
			originality = { passed: true, detail: 'No media attached to check.' };
		} else {
			const mediaColumn = post.videoUrl ? posts.videoUrl : posts.imageUrl;
			const dupes = await db
				.select({ id: posts.id })
				.from(posts)
				.where(and(ne(posts.id, post.id), eq(mediaColumn, mediaUrl)));

			originality =
				dupes.length > 0
					? { passed: false, detail: `This media appears in ${dupes.length} other post(s) — may be reposted.` }
					: { passed: true, detail: 'Media not found in any other posts.' };
		}

		const externalEngagement: ClaimVerificationResult['checks']['externalEngagement'] = {
			mode: 'stub',
			detail: 'External engagement metrics (off-platform reach, social shares) are not connected — stubbed.',
		};

		const verified: boolean | null = geoTimeMatch.passed === null ? (originality.passed ? null : false) : geoTimeMatch.passed && originality.passed;

		return {
			verified,
			notes: `${geoTimeMatch.detail} ${originality.detail} ${externalEngagement.detail}`,
			checks: { geoTimeMatch, originality, externalEngagement },
		};
	},
};
