import { json } from '@sveltejs/kit';

/**
 * The /api/agent/* and /.well-known/agent.json endpoints are a public,
 * read-only, unauthenticated surface meant for external AI agents — so
 * responses are CORS-open (no cookies/auth involved, nothing to protect).
 */
const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export function agentJson(data: unknown, init?: ResponseInit) {
	return json(data, { ...init, headers: { ...CORS_HEADERS, ...init?.headers } });
}

export const agentOptions = async () => new Response(null, { headers: CORS_HEADERS });
