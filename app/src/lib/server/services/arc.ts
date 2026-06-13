import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';

const mode: ServiceMode = env.ARC_RPC_URL ? 'live' : 'stub';

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
};
