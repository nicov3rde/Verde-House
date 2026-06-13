import { env } from '$env/dynamic/private';
import type { ServiceMode } from './types';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type MediaBackend = 'cloudinary' | 'vercel-blob' | 'stub';
export type MediaType = 'image' | 'video';

const backend: MediaBackend =
	env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
		? 'cloudinary'
		: env.BLOB_READ_WRITE_TOKEN
			? 'vercel-blob'
			: 'stub';

const mode: ServiceMode = backend === 'stub' ? 'stub' : 'live';

export interface UploadResult {
	url: string;
	mediaType: MediaType;
}

function mediaTypeOf(file: File): MediaType {
	return file.type.startsWith('video/') ? 'video' : 'image';
}

function extensionOf(file: File, mediaType: MediaType): string {
	const fromName = file.name.split('.').pop()?.toLowerCase();
	if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
	return mediaType === 'video' ? 'mp4' : 'jpg';
}

/**
 * Stub backend: writes the upload to the app's static/uploads directory so it's
 * served from /uploads/<file> in dev. Serverless deploys (Vercel) have a
 * read-only filesystem, so this throws there — configure CLOUDINARY_* or
 * BLOB_READ_WRITE_TOKEN for persistent storage in production.
 */
async function uploadToLocalStub(file: File): Promise<UploadResult> {
	const mediaType = mediaTypeOf(file);
	const filename = `${randomUUID()}.${extensionOf(file, mediaType)}`;
	const dir = path.join(process.cwd(), 'static', 'uploads');

	try {
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
	} catch {
		throw new Error(
			'Media storage is not configured for this deployment (stub mode needs a writable filesystem). ' +
				'Set CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET or BLOB_READ_WRITE_TOKEN.',
		);
	}

	return { url: `/uploads/${filename}`, mediaType };
}

async function uploadToCloudinary(file: File): Promise<UploadResult> {
	const mediaType = mediaTypeOf(file);
	const timestamp = Math.floor(Date.now() / 1000);

	const { createHash } = await import('node:crypto');
	const signature = createHash('sha1')
		.update(`timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`)
		.digest('hex');

	const form = new FormData();
	form.append('file', file);
	form.append('api_key', env.CLOUDINARY_API_KEY!);
	form.append('timestamp', String(timestamp));
	form.append('signature', signature);

	const resourceType = mediaType === 'video' ? 'video' : 'image';
	const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
		method: 'POST',
		body: form,
	});

	if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status} ${await res.text()}`);

	const data = await res.json();
	return { url: data.secure_url as string, mediaType };
}

async function uploadToVercelBlob(file: File): Promise<UploadResult> {
	const mediaType = mediaTypeOf(file);
	const filename = `${randomUUID()}.${extensionOf(file, mediaType)}`;

	const res = await fetch(`https://blob.vercel-storage.com/${filename}`, {
		method: 'PUT',
		headers: {
			authorization: `Bearer ${env.BLOB_READ_WRITE_TOKEN}`,
			'x-api-version': '7',
			'content-type': file.type,
		},
		body: file,
	});

	if (!res.ok) throw new Error(`Vercel Blob upload failed: ${res.status} ${await res.text()}`);

	const data = await res.json();
	return { url: data.url as string, mediaType };
}

export const media = {
	mode,
	backend,
	maxImageSizeMb: 8,
	maxVideoSizeMb: 50,

	async upload(file: File): Promise<UploadResult> {
		if (backend === 'cloudinary') return uploadToCloudinary(file);
		if (backend === 'vercel-blob') return uploadToVercelBlob(file);
		return uploadToLocalStub(file);
	},
};
