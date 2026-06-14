import { worldId } from './worldId';
import { ens } from './ens';
import { unlink } from './unlink';
import { arc } from './arc';
import { computeReliabilityScore, computeAuthorityScore, type ExpertisePost, type ReliabilityClaim, type AuthorityScoreInput } from './reliability';

export { worldId, ens, unlink, arc };

type ChainProfileUser = {
	ensName: string | null;
	worldIdVerified: boolean;
	worldIdNullifier: string | null;
	earningsPrivate: boolean;
	createdAt: Date;
};

/** Aggregates all chain/identity service data needed to render a profile. */
export function getChainProfile(
	user: ChainProfileUser,
	posts: ExpertisePost[],
	bountyClaims: ReliabilityClaim[] = [],
	authorityInput: AuthorityScoreInput = { postRankSum: 0, vouchesReceived: 0, vouchesGiven: 0 },
) {
	return {
		worldId: worldId.getStatus(user),
		ens: {
			name: ens.getName(user),
			expertise: ens.getExpertise(posts),
		},
		unlink: unlink.getWalletStatus(user),
		arc: arc.getNetworkInfo(),
		reliability: computeReliabilityScore(user, posts, bountyClaims),
		authority: computeAuthorityScore(authorityInput),
	};
}
