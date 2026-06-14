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

	/**
	 * Shielded balance for a user's own dashboard. `totalUsdc` is computed
	 * server-side from `transactions` regardless of mode, but is withheld from
	 * the response entirely when `earningsPrivate` is true — the page never
	 * receives the figure to render. In `live` mode, this gate would instead be
	 * enforced by Unlink's ZK balance commitments rather than a server-side omission.
	 */
	getShieldedBalance(user: UnlinkUser, totalEarningsUsdc: number) {
		return {
			mode,
			privacyActive: user.earningsPrivate,
			totalUsdc: user.earningsPrivate ? null : totalEarningsUsdc,
		};
	},
};
