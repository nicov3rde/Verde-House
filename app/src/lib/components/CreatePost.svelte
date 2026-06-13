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
	let placeName = $state(bountyClaim?.placeName ?? '');
	let posting = $state(false);
	let error = $state('');

	async function submit(e: Event) {
		e.preventDefault();
		if (!caption.trim() && !imageUrl.trim()) return;

		posting = true;
		error = '';

		try {
			const res = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ caption, imageUrl, placeName, bountyClaimId: bountyClaim?.id }),
			});

			if (!res.ok) throw new Error('Failed to create post');

			caption = '';
			imageUrl = '';
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
		<div class="badge badge-verified" style="align-self:flex-start">
			🎯 Fulfilling bounty: {bountyClaim.bountyTitle}
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

	<div style="display:flex;gap:0.5rem;flex-wrap:wrap">
		<input class="input" type="url" placeholder="Image URL (optional)" bind:value={imageUrl} style="flex:1;min-width:160px" />
		<input class="input" type="text" placeholder="📍 Place (optional)" bind:value={placeName} style="flex:1;min-width:140px" />
	</div>

	{#if error}
		<div class="form-error">{error}</div>
	{/if}

	<div style="display:flex;justify-content:flex-end">
		<button type="submit" class="btn btn-primary" disabled={posting || (!caption.trim() && !imageUrl.trim())}>
			{#if posting}
				<span class="spinner" style="width:1rem;height:1rem;border-width:2px"></span>
			{/if}
			Post
		</button>
	</div>
</form>
