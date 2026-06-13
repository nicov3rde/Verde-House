// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { SessionUser } from '$lib/auth';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			session: { id: string; userId: string; expiresAt: Date } | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
