import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { media } from '$lib/server/services/media';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File) || file.size === 0) {
		throw error(400, 'No file provided');
	}

	const isImage = file.type.startsWith('image/');
	const isVideo = file.type.startsWith('video/');
	if (!isImage && !isVideo) {
		throw error(400, 'Only image and video files are supported');
	}

	const maxMb = isVideo ? media.maxVideoSizeMb : media.maxImageSizeMb;
	if (file.size > maxMb * 1024 * 1024) {
		throw error(413, `File too large (max ${maxMb}MB)`);
	}

	try {
		const result = await media.upload(file);
		return json({ ...result, mode: media.mode, backend: media.backend });
	} catch (err) {
		throw error(500, err instanceof Error ? err.message : 'Upload failed');
	}
};
