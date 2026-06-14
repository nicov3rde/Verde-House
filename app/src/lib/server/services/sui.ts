import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';
import { createHash } from 'node:crypto';

const mode: ServiceMode = env.SUI_RPC_URL ? 'live' : 'stub';

export interface AnchorReceipt {
	mode: ServiceMode;
	network: 'Sui';
	/** sha256 of the anchored payload — computed locally in both modes. */
	hash: string;
	/** On-chain transaction digest. Null in stub mode (nothing was submitted). */
	txDigest: string | null;
}

export const sui = {
	mode,
	network: 'Sui' as const,

	getStatus() {
		return { mode, network: 'Sui' as const };
	},

	/**
	 * Anchors a hash of `data` as an immutable receipt. In stub mode this only
	 * computes the hash locally (no on-chain write). In live mode it would
	 * submit a transaction via the Sui SDK using SUI_RPC_URL/SUI_PRIVATE_KEY,
	 * returning the resulting transaction digest.
	 */
	async anchorReceipt(data: Record<string, unknown>): Promise<AnchorReceipt> {
		const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');

		if (mode === 'stub') {
			return { mode, network: 'Sui', hash, txDigest: null };
		}

		// Live mode: submit `hash` to a Sui Move package via env.SUI_RPC_URL /
		// SUI_PRIVATE_KEY and return the resulting transaction digest.
		return { mode, network: 'Sui', hash, txDigest: null };
	},
};
