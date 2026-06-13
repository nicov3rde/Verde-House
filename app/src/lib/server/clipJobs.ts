import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const CLIP_BOT_DIR = path.resolve(process.cwd(), '../clip-bot');
const PYTHON_BIN = path.join(CLIP_BOT_DIR, 'venv', 'Scripts', 'python.exe');

export interface ClipShort {
	title: string;
	hook_sentence: string;
	score: number;
	start_time: number;
	end_time: number;
	filename: string | null;
	error?: string;
}

export interface ClipJob {
	id: string;
	status: 'running' | 'done' | 'error';
	message: string;
	percent: number;
	log: string[];
	outDir: string;
	shorts?: ClipShort[];
	error?: string;
}

const jobs = new Map<string, ClipJob>();

// Mirrors the progress mapping used by the consumer-app worker for clip-bot's stdout.
function parseProgress(line: string): [string, number] {
	const l = line.toLowerCase();
	if (l.includes('[download/local]')) {
		if (l.includes('reusing')) return ['Using cached download', 12];
		return ['Downloading video…', 8];
	}
	if (l.includes('[transcribe/local]')) {
		if (l.includes('reusing')) return ['Using cached transcript', 32];
		if (l.includes('segments') && l.includes('audio')) return ['Transcription complete', 45];
		return ['Transcribing audio with Whisper…', 28];
	}
	if (l.includes('[highlights] content=')) return ['Detecting content type…', 50];
	if (l.includes('[highlights] long video')) return ['Chunking long video for analysis…', 52];
	if (l.includes('[highlights] chunk')) {
		const m = line.match(/chunk (\d+)\/(\d+)/i);
		if (m) {
			const i = parseInt(m[1], 10);
			const total = parseInt(m[2], 10);
			return [`Finding highlights — chunk ${i}/${total}`, 52 + Math.round((i / total) * 18)];
		}
		return ['Finding viral moments…', 55];
	}
	if (l.includes('[pipeline/local] cropping')) return ['Rendering clips…', 72];
	if (l.includes('[clip/local]')) {
		const m = line.match(/(\d+)\/(\d+):/);
		if (m) {
			const i = parseInt(m[1], 10);
			const total = parseInt(m[2], 10);
			return [`Rendering clip ${i} of ${total}…`, 72 + Math.round((i / total) * 25)];
		}
		return ['Rendering clip…', 78];
	}
	return ['', 0];
}

export function startClipJob(url: string, numClips: number, aspectRatio: string): string {
	const id = randomUUID();
	const outDir = path.join(CLIP_BOT_DIR, 'output', 'web', id);
	mkdirSync(outDir, { recursive: true });

	const job: ClipJob = {
		id,
		status: 'running',
		message: 'Starting…',
		percent: 2,
		log: [],
		outDir
	};
	jobs.set(id, job);

	const resultJsonPath = path.join(outDir, 'result.json');
	const args = [
		'main.py',
		url,
		'--mode',
		'local',
		'--num-clips',
		String(numClips),
		'--aspect-ratio',
		aspectRatio,
		'--language',
		'en',
		'--output-json',
		resultJsonPath
	];

	const child = spawn(PYTHON_BIN, args, {
		cwd: CLIP_BOT_DIR,
		env: { ...process.env, LOCAL_OUTPUT_DIR: outDir, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' }
	});

	const onData = (chunk: Buffer) => {
		const text = chunk.toString('utf-8');
		for (const rawLine of text.split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line) continue;
			job.log.push(line);
			if (job.log.length > 300) job.log.shift();
			const [msg, pct] = parseProgress(line);
			if (msg) {
				job.message = msg;
				job.percent = pct;
			}
		}
	};

	child.stdout.on('data', onData);
	child.stderr.on('data', onData);

	child.on('close', async (code) => {
		if (code === 0) {
			try {
				const raw = await readFile(resultJsonPath, 'utf-8');
				const result = JSON.parse(raw);
				job.shorts = (result.shorts ?? []).map((s: Record<string, unknown>) => ({
					title: s.title,
					hook_sentence: s.hook_sentence,
					score: s.score,
					start_time: s.start_time,
					end_time: s.end_time,
					filename: s.clip_url ? path.basename(String(s.clip_url)) : null,
					error: s.error
				}));
				job.status = 'done';
				job.message = 'Done';
				job.percent = 100;
			} catch (e) {
				job.status = 'error';
				job.error = `Failed to read results: ${e instanceof Error ? e.message : e}`;
			}
		} else {
			job.status = 'error';
			job.error = job.log.slice(-5).join('\n') || `Process exited with code ${code}`;
		}
	});

	child.on('error', (err) => {
		job.status = 'error';
		job.error = `Failed to start clip-bot: ${err.message}`;
	});

	return id;
}

export function getClipJob(id: string): ClipJob | undefined {
	return jobs.get(id);
}
