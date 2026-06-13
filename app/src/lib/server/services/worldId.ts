import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';

const mode: ServiceMode = env.WORLD_ID_APP_ID ? 'live' : 'stub';

type WorldIdUser = {
	worldIdVerified: boolean;
	worldIdNullifier: string | null;
};

export const worldId = {
	mode,

	/** Personhood-verification status as recorded for this user. */
	getStatus(user: WorldIdUser) {
		return {
			mode,
			verified: user.worldIdVerified,
			nullifierHash: user.worldIdNullifier,
		};
	},
};
