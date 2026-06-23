import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { startClipJob, startClipJobModal, isModalConfigured } from '$lib/server/clipJobs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const ASPECT_RATIOS = new Set(['9:16', '1:1', '16:9']);
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const UPLOAD_DIR = path.resolve(process.cwd(), '../clip-bot/output/web/uploads');

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const contentType = request.headers.get('content-type') ?? '';

	let source: string;
	let isUrl = true;
	let numClips = 5;
	let aspectRatio = '9:16';

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const url = formData.get('url') as string | null;

		numClips = parseInt(formData.get('numClips') as string, 10) || 5;
		numClips = Math.min(Math.max(numClips, 1), 15);
		const ar = formData.get('aspectRatio') as string | null;
		aspectRatio = ar && ASPECT_RATIOS.has(ar) ? ar : '9:16';

		if (file && file.size > 0) {
			if (file.size > MAX_FILE_SIZE) throw error(400, 'File too large (max 2 GB)');

			const ext = path.extname(file.name) || '.mp4';
			const safeName = `${randomUUID()}${ext}`;
			await mkdir(UPLOAD_DIR, { recursive: true });
			const filePath = path.join(UPLOAD_DIR, safeName);
			const buf = Buffer.from(await file.arrayBuffer());
			await writeFile(filePath, buf);
			source = filePath;
			isUrl = false;
		} else if (url && url.trim()) {
			source = url.trim();
		} else {
			throw error(400, 'Provide a video file or URL');
		}
	} else {
		const body = await request.json();
		const url = String(body.url ?? '').trim();
		if (!url) throw error(400, 'A video URL is required');

		numClips = parseInt(body.numClips, 10);
		if (!Number.isFinite(numClips)) numClips = 5;
		numClips = Math.min(Math.max(numClips, 1), 15);
		aspectRatio = ASPECT_RATIOS.has(body.aspectRatio) ? body.aspectRatio : '9:16';
		source = url;
	}

	// Use Modal for URL jobs when configured; file uploads always run locally
	const useModal = isUrl && isModalConfigured();
	const jobId = useModal
		? startClipJobModal(source, numClips, aspectRatio)
		: startClipJob(source, numClips, aspectRatio);

	return json({ jobId });
};
