import { env } from '$env/dynamic/private';
import type { users } from '$lib/db/schema';

type DevUser = Pick<typeof users.$inferSelect, 'handle' | 'role'>;

const HARD_ALLOWED_HANDLES = new Set(['nicov3rde']);

function adminHandles(): Set<string> {
	return new Set(
		(env.ADMIN_HANDLES ?? '')
			.split(',')
			.map((h) => h.trim().toLowerCase())
			.filter(Boolean),
	);
}

/** Gates access to the developer panel (`/admin`) and its actions. */
export function isDeveloper(user: DevUser | null | undefined): boolean {
	if (!user) return false;
	if (user.role === 'admin') return true;
	const handle = user.handle.toLowerCase();
	return HARD_ALLOWED_HANDLES.has(handle) || adminHandles().has(handle);
}
