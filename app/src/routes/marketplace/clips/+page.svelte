<script lang="ts">
	import { onDestroy } from 'svelte';

	type Short = {
		title: string;
		hook_sentence: string;
		score: number;
		start_time: number;
		end_time: number;
		filename: string | null;
		error?: string;
	};

	type JobStatus = {
		status: 'running' | 'done' | 'error';
		message: string;
		percent: number;
		log: string[];
		shorts?: Short[];
		error?: string;
	};

	let inputMode = $state<'url' | 'file'>('url');
	let url = $state('');
	let videoFile = $state<File | null>(null);
	let numClips = $state(5);
	let aspectRatio = $state('9:16');

	let jobId = $state<string | null>(null);
	let job = $state<JobStatus | null>(null);
	let submitting = $state(false);
	let formError = $state('');

	let fileInputEl: HTMLInputElement;
	let pollHandle: ReturnType<typeof setInterval> | null = null;

	function stopPolling() {
		if (pollHandle) {
			clearInterval(pollHandle);
			pollHandle = null;
		}
	}

	function startPolling() {
		stopPolling();
		pollHandle = setInterval(async () => {
			if (!jobId) return;
			const res = await fetch(`/api/clips/${jobId}`);
			if (!res.ok) return;
			job = await res.json();
			if (job?.status === 'done' || job?.status === 'error') stopPolling();
		}, 3000);
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		videoFile = input.files?.[0] ?? null;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files[0];
		if (file && file.type.startsWith('video/')) {
			videoFile = file;
			inputMode = 'file';
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function fmtFileSize(bytes: number): string {
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	}

	async function generate() {
		formError = '';

		if (inputMode === 'url' && !url.trim()) {
			formError = 'Paste a YouTube URL first.';
			return;
		}
		if (inputMode === 'file' && !videoFile) {
			formError = 'Select a video file first.';
			return;
		}

		submitting = true;
		job = null;
		try {
			let res: Response;

			if (inputMode === 'file' && videoFile) {
				const fd = new FormData();
				fd.append('file', videoFile);
				fd.append('numClips', String(numClips));
				fd.append('aspectRatio', aspectRatio);
				res = await fetch('/api/clips', { method: 'POST', body: fd });
			} else {
				res = await fetch('/api/clips', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: url.trim(), numClips, aspectRatio })
				});
			}

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message ?? 'Failed to start job');
			}
			const data = await res.json();
			jobId = data.jobId;
			job = { status: 'running', message: 'Starting…', percent: 2, log: [] };
			startPolling();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			submitting = false;
		}
	}

	function reset() {
		stopPolling();
		jobId = null;
		job = null;
		formError = '';
	}

	function fmtTime(sec: number) {
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	onDestroy(stopPolling);
</script>

<svelte:head>
	<title>Clip Studio · Marketplace · Verde House</title>
</svelte:head>

<div class="profile-col">
	<div style="display:flex;align-items:center;gap:0.6rem">
		<a href="/marketplace" class="btn btn-secondary btn-sm">← Marketplace</a>
		<h1 style="font-size:1.3rem">Clip Studio</h1>
	</div>

	<div class="card" style="padding:1.25rem" ondrop={handleDrop} ondragover={handleDragOver}>
		<h2 style="font-size:1.05rem;margin-bottom:0.25rem">Generate clips</h2>
		<p class="text-secondary" style="font-size:0.85rem;margin-bottom:1rem">
			Paste a YouTube link or upload a video file to generate short, vertical clips with burned-in captions.
		</p>

		{#if !job || job.status === 'error'}
			<!-- Source toggle -->
			<div class="mp-view-toggle" style="margin-bottom:0.75rem">
				<button
					class="mp-view-btn"
					class:active={inputMode === 'url'}
					onclick={() => inputMode = 'url'}
				>[ URL ]</button>
				<button
					class="mp-view-btn"
					class:active={inputMode === 'file'}
					onclick={() => inputMode = 'file'}
				>[ Upload ]</button>
			</div>

			{#if inputMode === 'url'}
				<div class="form-group">
					<label class="form-label" for="clip-url">YouTube URL</label>
					<input
						id="clip-url"
						class="input"
						type="url"
						placeholder="https://www.youtube.com/watch?v=..."
						bind:value={url}
						disabled={submitting}
					/>
				</div>
			{:else}
				<div class="form-group">
					<label class="form-label" for="clip-file">Video file</label>
					{#if videoFile}
						<div class="clip-file-preview">
							<div class="clip-file-info">
								<span style="font-weight:600;font-size:0.85rem">{videoFile.name}</span>
								<span class="text-muted" style="font-size:0.75rem">{fmtFileSize(videoFile.size)}</span>
							</div>
							<button
								class="btn btn-ghost btn-sm"
								onclick={() => { videoFile = null; if (fileInputEl) fileInputEl.value = ''; }}
							>✕</button>
						</div>
					{:else}
						<label class="clip-dropzone" for="clip-file">
							<div style="font-size:1.5rem;margin-bottom:0.35rem">↑</div>
							<div style="font-size:0.85rem;font-weight:600">Drop a video here</div>
							<div class="text-muted" style="font-size:0.75rem;margin-top:0.2rem">or click to browse · MP4, MOV, MKV, WebM</div>
						</label>
					{/if}
					<input
						id="clip-file"
						type="file"
						accept="video/*,.mp4,.mov,.mkv,.webm,.avi"
						onchange={handleFileChange}
						bind:this={fileInputEl}
						disabled={submitting}
						style="display:none"
					/>
				</div>
			{/if}

			<div style="display:flex;gap:1rem;margin-top:0.75rem;flex-wrap:wrap">
				<div class="form-group" style="flex:1;min-width:140px">
					<label class="form-label" for="clip-count">Number of clips</label>
					<input
						id="clip-count"
						class="input"
						type="number"
						min="1"
						max="15"
						bind:value={numClips}
						disabled={submitting}
					/>
				</div>
				<div class="form-group" style="flex:1;min-width:140px">
					<label class="form-label" for="aspect">Aspect ratio</label>
					<select id="aspect" class="input" bind:value={aspectRatio} disabled={submitting}>
						<option value="9:16">9:16 (vertical)</option>
						<option value="1:1">1:1 (square)</option>
						<option value="16:9">16:9 (horizontal)</option>
					</select>
				</div>
			</div>

			{#if formError}
				<p class="form-error" style="margin-top:0.5rem">{formError}</p>
			{/if}
			{#if job?.status === 'error'}
				<p class="form-error" style="margin-top:0.5rem">{job.error}</p>
			{/if}

			<button
				class="btn btn-primary btn-lg"
				style="margin-top:1rem;width:100%"
				onclick={generate}
				disabled={submitting}
			>
				{#if submitting}<span class="spinner"></span> {inputMode === 'file' ? 'Uploading…' : 'Starting…'}{:else}Generate Clips{/if}
			</button>
		{/if}

		{#if job && job.status === 'running'}
			<div style="margin-top:1rem">
				<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.5rem">
					<span class="spinner"></span>
					<span style="font-size:0.9rem;font-weight:600">{job.message}</span>
				</div>
				<div style="background:var(--bg-input);border-radius:0;height:8px;overflow:hidden">
					<div
						style="background:var(--verde);height:100%;width:{job.percent}%;transition:width 0.4s"
					></div>
				</div>
				<pre
					style="margin-top:0.75rem;max-height:160px;overflow-y:auto;font-size:0.7rem;color:var(--text-muted);background:var(--bg-input);padding:0.6rem;border-radius:0;white-space:pre-wrap">{job.log.join(
						'\n'
					)}</pre>
			</div>
		{/if}

		{#if job && job.status === 'done' && job.shorts}
			<div style="margin-top:1rem;display:flex;flex-direction:column;gap:1rem">
				{#each job.shorts as short, i (i)}
					{#if short.filename}
						<div class="card-elevated" style="padding:0.75rem;display:flex;gap:0.75rem;flex-wrap:wrap">
							<video
								controls
								preload="metadata"
								style="width:160px;aspect-ratio:9/16;border-radius:0;background:#000;object-fit:cover;flex-shrink:0"
								src={`/api/clips/${jobId}/file/${short.filename}`}
							></video>
							<div style="flex:1;min-width:180px">
								<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem">
									<span class="badge badge-verified">Score {short.score}</span>
									<span class="text-muted" style="font-size:0.75rem"
										>{fmtTime(short.start_time)}–{fmtTime(short.end_time)}</span
									>
								</div>
								<div style="font-weight:600;font-size:0.9rem;margin-bottom:0.25rem">{short.title}</div>
								<div class="text-secondary" style="font-size:0.8rem;margin-bottom:0.6rem">
									"{short.hook_sentence}"
								</div>
								<a
									class="btn btn-secondary btn-sm"
									href={`/api/clips/${jobId}/file/${short.filename}`}
									download={short.filename}
								>
									⬇ Download
								</a>
							</div>
						</div>
					{:else}
						<div class="card-elevated" style="padding:0.75rem;color:#ff5050;font-size:0.85rem">
							Clip {i + 1} failed: {short.error}
						</div>
					{/if}
				{/each}
			</div>
			<button class="btn btn-secondary" style="margin-top:1rem" onclick={reset}>
				Generate another
			</button>
		{/if}
	</div>
</div>

<style>
	.clip-dropzone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		border: 2px dashed var(--border-strong);
		background: var(--bg-input);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.clip-dropzone:hover {
		border-color: var(--verde);
		background: var(--bg-hover);
	}

	.clip-file-preview {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 0.85rem;
		background: var(--bg-input);
		border: 1px solid var(--border);
	}

	.clip-file-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		overflow: hidden;
	}

	.clip-file-info span:first-child {
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
</style>
