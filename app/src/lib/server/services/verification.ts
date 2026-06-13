import type { ServiceMode } from './types';

const mode: ServiceMode = 'stub';

export const verification = {
	mode,

	/**
	 * Placeholder for the future agent-driven claim verification. Always
	 * returns a null verdict so claims fall through to manual business/admin
	 * review via the verify/reject actions.
	 */
	async checkClaim() {
		return {
			mode,
			verified: null as boolean | null,
			notes: 'Agent verification not yet connected — pending manual review.',
		};
	},
};
