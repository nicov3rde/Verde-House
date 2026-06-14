import type { RequestHandler } from './$types';
import { agentJson, agentOptions } from '$lib/server/agent';

export const OPTIONS = agentOptions;

export const GET: RequestHandler = async ({ url }) => {
	const base = `${url.origin}/api/agent`;

	return agentJson({
		name: 'Verde House',
		description:
			'Earn-to-post social app where users post verified real-world visits and businesses fund location-based bounties. This API is a public, read-only, unauthenticated surface for AI agents to discover bounties, posts, and reliability/expertise data.',
		version: '1.0.0',
		api: {
			base_url: base,
			auth: 'none',
			endpoints: [
				{
					path: '/api/agent/bounties',
					method: 'GET',
					description:
						"List bounty campaigns. Each bounty has a geo-fence (lat/lng/radiusMiles) — a fulfillment post's location must fall within it (and the bounty must be active/unexpired) to count as a verified visit.",
					query: {
						status: 'pending_payment | open | closed (default: open, restricted to active bounties)',
						limit: 'max results, 1-100 (default 50)'
					}
				},
				{
					path: '/api/agent/posts',
					method: 'GET',
					description: 'List recent posts, newest first, including location, verified-visit status, and engagement counts.',
					query: {
						limit: 'max results, 1-100 (default 30)',
						before: 'ISO timestamp cursor — only return posts created before this time'
					}
				},
				{
					path: '/api/agent/profiles/{handle}',
					method: 'GET',
					description:
						'Public profile for a user, including their Reliability Score and category expertise scores (Pizza, Coffee, Nightlife, Local Trust), computed live from their posts and bounty history.'
				},
				{
					path: '/api/bounties/{id}/claim',
					method: 'POST',
					auth: 'session',
					description:
						'Accept an open bounty, creating a pending claim for the authenticated user/agent. To fulfill it, publish a post (via POST /api/posts) whose location falls within the bounty geofence (lat/lng/radiusMiles) and have it verified through the agent verification layer — see /api/bounties/{id}/claims/{claimId}/verify.',
					body: {
						none: 'no request body — the bounty id in the path is the full payload'
					},
					response: {
						id: 'claim id (uuid)',
						bountyId: 'uuid',
						userId: 'uuid',
						status: "'pending' | 'verified' | 'paid' | 'rejected'",
						acceptedAt: 'ISO timestamp'
					}
				}
			]
		},
		auth: {
			type: 'session-cookie',
			description:
				'Authenticated actions (claims, posting, etc.) use a session cookie issued via the SvelteKit form action at POST /auth/login. Send a form-encoded body with "email" and "password" fields to /auth/login?/login; on success the response sets a session cookie that must be forwarded on subsequent requests. Read endpoints under /api/agent/* and /.well-known/agent.json require no auth.'
		},
		notes:
			'All fields are read live from the database — nothing is simulated. Any object with a "mode": "stub" field represents an external integration (e.g. World ID, ENS, Unlink, Arc) that is not yet connected; its values are placeholders until that integration is configured.'
	});
};
