import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClipJob } from '$lib/server/clipJobs';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const job = getClipJob(params.jobId);
	if (!job) throw error(404, 'Job not found');

	// basename() strips any path separators, so this can't escape outDir.
	const filename = path.basename(params.filename);
	const filePath = path.join(job.outDir, filename);
	if (!existsSync(filePath)) throw error(404, 'File not found');

	const stat = statSync(filePath);
	const nodeStream = createReadStream(filePath);
	const body = new ReadableStream({
		start(controller) {
			nodeStream.on('data', (chunk) => controller.enqueue(chunk));
			nodeStream.on('end', () => controller.close());
			nodeStream.on('error', (err) => controller.error(err));
		},
		cancel() {
			nodeStream.destroy();
		}
	});

	return new Response(body, {
		headers: {
			'Content-Type': 'video/mp4',
			'Content-Length': String(stat.size),
			'Content-Disposition': `inline; filename="${filename}"`,
			'Cache-Control': 'no-store'
		}
	});
};
