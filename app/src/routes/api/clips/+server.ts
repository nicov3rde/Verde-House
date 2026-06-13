import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startClipJob } from '$lib/server/clipJobs';

const ASPECT_RATIOS = new Set(['9:16', '1:1', '16:9']);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body = await request.json();
	const url = String(body.url ?? '').trim();
	if (!url) throw error(400, 'A video URL is required');

	let numClips = parseInt(body.numClips, 10);
	if (!Number.isFinite(numClips)) numClips = 5;
	numClips = Math.min(Math.max(numClips, 1), 15);

	const aspectRatio = ASPECT_RATIOS.has(body.aspectRatio) ? body.aspectRatio : '9:16';

	const jobId = startClipJob(url, numClips, aspectRatio);
	return json({ jobId });
};
