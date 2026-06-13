import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClipJob } from '$lib/server/clipJobs';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const job = getClipJob(params.jobId);
	if (!job) throw error(404, 'Job not found');

	return json({
		status: job.status,
		message: job.message,
		percent: job.percent,
		log: job.log.slice(-30),
		shorts: job.shorts,
		error: job.error
	});
};
