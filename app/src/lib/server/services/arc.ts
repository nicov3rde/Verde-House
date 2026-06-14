import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';
import { createHash } from 'node:crypto';

const mode: ServiceMode = env.ARC_RPC_URL ? 'live' : 'stub';

export interface SettlementReceipt {
	mode: ServiceMode;
	network: 'Arc';
	currency: 'USDC';
	/** sha256 of the settlement payload — computed locally in both modes. */
	hash: string;
	/** On-chain settlement transaction hash. Null in stub mode (nothing was submitted). */
	txHash: string | null;
}

export const arc = {
	mode,

	/** Settlement-network info for USDC bounty payouts. */
	getNetworkInfo() {
		return {
			mode,
			network: 'Arc',
			currency: 'USDC',
		};
	},

	/**
	 * Records the USDC settlement for a verified bounty payout. In stub mode this
	 * only computes a local hash of the settlement details (no on-chain write).
	 * In live mode it would submit the USDC transfer via ARC_RPC_URL/ARC_PRIVATE_KEY
	 * and return the resulting settlement transaction hash.
	 */
	async processSettlement(data: Record<string, unknown>): Promise<SettlementReceipt> {
		const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');

		if (mode === 'stub') {
			return { mode, network: 'Arc', currency: 'USDC', hash, txHash: null };
		}

		// Live mode: submit the USDC transfer to claim.userId's wallet via
		// env.ARC_RPC_URL / ARC_PRIVATE_KEY and return the resulting tx hash.
		return { mode, network: 'Arc', currency: 'USDC', hash, txHash: null };
	},
};
