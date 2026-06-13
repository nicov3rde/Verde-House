import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';

const mode: ServiceMode = env.UNLINK_API_KEY ? 'live' : 'stub';

type UnlinkUser = {
	earningsPrivate: boolean;
};

export const unlink = {
	mode,

	/**
	 * Shielded-wallet status. When privacy is active, balances and payout
	 * amounts stay hidden client-side behind Unlink's ZK proofs.
	 */
	getWalletStatus(user: UnlinkUser) {
		return {
			mode,
			privacyActive: user.earningsPrivate,
		};
	},
};
