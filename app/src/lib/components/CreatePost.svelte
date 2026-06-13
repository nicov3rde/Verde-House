<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let {
		user,
		bountyClaim = null,
	}: {
		user: { id: string; handle: string; displayName: string; avatarUrl?: string | null };
		bountyClaim?: { id: string; bountyTitle: string; placeName: string | null } | null;
	} = $props();

	let caption = $state('');
	let imageUrl = $state('');
	let videoUrl = $state('');
	let placeName = $state(bountyClaim?.placeName ?? '');
	let posting = $state(false);
	let error = $state('');

	let uploading = $state(false);
	let uploadStatus = $state('');

	let lat = $state<number | null>(null);
	let lng = $state<number | null>(null);
	let locationStatus = $state<'idle' | 'requesting' | 'shared' | 'unavailable'>('idle');

	// Bounty fulfillment posts get geo-fence checked, so request the poster's
	// location once when filling out a bounty submission.
	$effect(() => {
		if (!bountyClaim || locationStatus !== 'idle') return;
		if (!('geolocation' in navigator)) {
			locationStatus = 'unavailable';
			return;
		}
		locationStatus = 'requesting';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				lat = pos.coords.latitude;
				lng = pos.coords.longitude;
				locationStatus = 'shared';
			},
			() => {
				locationStatus = 'unavailable';
			},
			{ timeout: 10000 },
		);
	});

	async function onFileSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		error = '';
		try {
			const form = new FormData();
			form.append('file', file);

			const res = await fetch('/api/media/upload', { method: 'POST', body: form });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error(body?.message ?? 'Upload failed');
			}

			const result = await res.json();
			if (result.mediaType === 'video') {
				videoUrl = result.url;
				imageUrl = '';
			} else {
				imageUrl = result.url;
				videoUrl = '';
			}
			uploadStatus = result.mode === 'stub' ? `Stored via local stub (${result.backend})` : `Uploaded via ${result.backend}`;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function removeMedia() {
		imageUrl = '';
		videoUrl = '';
		uploadStatus = '';
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (!caption.trim() && !imageUrl.trim() && !videoUrl.trim()) return;

		posting = true;
		error = '';

		try {
			const res = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ caption, imageUrl, videoUrl, placeName, bountyClaimId: bountyClaim?.id, lat, lng }),
			});

			if (!res.ok) throw new Error('Failed to create post');

			caption = '';
			imageUrl = '';
			videoUrl = '';
			uploadStatus = '';
			if (!bountyClaim) placeName = '';
			await invalidateAll();
		} catch {
			error = 'Could not create post. Try again.';
		} finally {
			posting = false;
		}
	}
</script>

<form class="card" style="padding:1rem;display:flex;flex-direction:column;gap:0.75rem" onsubmit={submit}>
	{#if bountyClaim}
		<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
			<div class="badge badge-verified">
				🎯 Fulfilling bounty: {bountyClaim.bountyTitle}
			</div>
			{#if locationStatus === 'shared'}
				<span class="text-secondary" style="font-size:0.75rem">📍 Location shared for geo-fence check</span>
			{:else if locationStatus === 'requesting'}
				<span class="text-secondary" style="font-size:0.75rem">📍 Requesting location…</span>
			{:else if locationStatus === 'unavailable'}
				<span class="text-secondary" style="font-size:0.75rem">⚠️ Location unavailable — submission won't be geo-verified</span>
			{/if}
		</div>
	{/if}
	<div style="display:flex;gap:0.65rem;align-items:flex-start">
		{#if user.avatarUrl}
			<img src={user.avatarUrl} alt={user.handle} class="avatar" style="width:40px;height:40px" />
		{:else}
			<div class="avatar-placeholder" style="width:40px;height:40px;font-size:1rem">{user.displayName[0]}</div>
		{/if}
		<textarea
			class="input"
			placeholder="What's happening nearby?"
			rows="2"
			bind:value={caption}
			style="flex:1"
		></textarea>
	</div>

	<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center">
		<label class="btn btn-secondary btn-sm" style="cursor:pointer">
			📷 Photo / video
			<input
				type="file"
				accept="image/*,video/*"
				onchange={onFileSelected}
				disabled={uploading}
				style="display:none"
			/>
		</label>
		{#if uploading}
			<span class="spinner" style="width:1rem;height:1rem;border-width:2px"></span>
			<span class="text-secondary" style="font-size:0.85rem">Uploading…</span>
		{/if}
		<input class="input" type="text" placeholder="📍 Place (optional)" bind:value={placeName} style="flex:1;min-width:140px" />
	</div>

	{#if imageUrl || videoUrl}
		<div class="media-preview">
			{#if videoUrl}
				<video src={videoUrl} class="media-preview-media" controls muted playsinline></video>
			{:else}
				<img src={imageUrl} alt="" class="media-preview-media" />
			{/if}
			<button type="button" class="media-preview-remove" onclick={removeMedia} aria-label="Remove media">✕</button>
		</div>
		{#if uploadStatus}
			<div class="text-secondary" style="font-size:0.75rem">{uploadStatus}</div>
		{/if}
	{/if}

	{#if error}
		<div class="form-error">{error}</div>
	{/if}

	<div style="display:flex;justify-content:flex-end">
		<button type="submit" class="btn btn-primary" disabled={posting || uploading || (!caption.trim() && !imageUrl.trim() && !videoUrl.trim())}>
			{#if posting}
				<span class="spinner" style="width:1rem;height:1rem;border-width:2px"></span>
			{/if}
			Post
		</button>
	</div>
</form>
