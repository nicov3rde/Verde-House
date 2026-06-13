import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';
import { computeExpertise, type ExpertiseCategory as ReliabilityCategory, type ExpertisePost } from './reliability';

const mode: ServiceMode = env.ETH_RPC_URL ? 'live' : 'stub';

export type ExpertiseCategory = ReliabilityCategory | 'localTrust';

export const ens = {
	mode,

	getName(user: { ensName: string | null }) {
		return user.ensName;
	},

	/**
	 * Category expertise scores (pizza/coffee/nightlife/localTrust), computed
	 * live from the user's posts — see ./reliability for the formula. Mirrored
	 * to ENS text records once an ENS name is set.
	 */
	getExpertise(posts: ExpertisePost[]) {
		return { mode, ...computeExpertise(posts) };
	},

	/** ENS text record key a given expertise category would be mirrored to. */
	textRecordKey(category: ExpertiseCategory): string {
		return category === 'localTrust' ? 'local_trust' : `${category}_exp`;
	},
};
