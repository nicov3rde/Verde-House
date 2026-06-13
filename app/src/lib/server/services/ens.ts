import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';

const mode: ServiceMode = env.ETH_RPC_URL ? 'live' : 'stub';

export type ExpertiseCategory = 'pizza' | 'coffee' | 'nightlife' | 'gym' | 'localTrust';

type EnsUser = {
	ensName: string | null;
	expertisePizza: number | null;
	expertiseCoffee: number | null;
	expertiseNightlife: number | null;
	expertiseGym: number | null;
};

type PostVisit = { verifiedVisit: boolean };

export const ens = {
	mode,

	getName(user: { ensName: string | null }) {
		return user.ensName;
	},

	/**
	 * Category expertise scores. pizza/coffee/nightlife/gym come straight from
	 * the user's profile; localTrust is derived from the share of their posts
	 * whose location was independently verified (M5 geofencing). All five are
	 * mirrored to ENS text records once an ENS name is set.
	 */
	getExpertise(user: EnsUser, posts: PostVisit[]) {
		const localTrust =
			posts.length > 0
				? Math.round((posts.filter((p) => p.verifiedVisit).length / posts.length) * 100)
				: 0;

		return {
			mode,
			pizza: user.expertisePizza ?? 0,
			coffee: user.expertiseCoffee ?? 0,
			nightlife: user.expertiseNightlife ?? 0,
			gym: user.expertiseGym ?? 0,
			localTrust,
		};
	},

	/** ENS text record key a given expertise category would be mirrored to. */
	textRecordKey(category: ExpertiseCategory): string {
		return category === 'localTrust' ? 'local_trust' : `${category}_exp`;
	},
};
