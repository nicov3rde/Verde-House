import { worldId } from './worldId';
import { ens } from './ens';
import { unlink } from './unlink';
import { arc } from './arc';

export { worldId, ens, unlink, arc };

type ChainProfileUser = {
	ensName: string | null;
	worldIdVerified: boolean;
	worldIdNullifier: string | null;
	earningsPrivate: boolean;
	expertisePizza: number | null;
	expertiseCoffee: number | null;
	expertiseNightlife: number | null;
	expertiseGym: number | null;
};

type ChainProfilePost = { verifiedVisit: boolean };

/** Aggregates all chain/identity service data needed to render a profile. */
export function getChainProfile(user: ChainProfileUser, posts: ChainProfilePost[]) {
	return {
		worldId: worldId.getStatus(user),
		ens: {
			name: ens.getName(user),
			expertise: ens.getExpertise(user, posts),
		},
		unlink: unlink.getWalletStatus(user),
		arc: arc.getNetworkInfo(),
	};
}
