import type { posts } from '$lib/db/schema';

export type PostWithAuthor = {
	post: typeof posts.$inferSelect;
	author: {
		id: string;
		handle: string;
		displayName: string;
		avatarUrl: string | null;
		isAgent: boolean;
		worldIdVerified: boolean;
	};
};
