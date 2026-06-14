<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let {
		postId,
		commentCount,
		currentUserId,
	}: {
		postId: string;
		commentCount: number;
		currentUserId?: string;
	} = $props();

	type Comment = {
		id: string;
		body: string;
		createdAt: string;
		author: { id: string; handle: string; displayName: string; avatarUrl?: string | null };
	};

	let comments = $state<Comment[]>([]);
	let loading = $state(true);
	let body = $state('');
	let posting = $state(false);

	onMount(load);

	async function load() {
		loading = true;
		try {
			const res = await fetch(`/api/posts/${postId}/comments`);
			if (res.ok) comments = await res.json();
		} catch {
			// backend route not wired up yet
		} finally {
			loading = false;
		}
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (!currentUserId) return goto('/auth/login');
		if (!body.trim()) return;

		posting = true;
		try {
			const res = await fetch(`/api/posts/${postId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body }),
			});
			if (res.ok) {
				body = '';
				await load();
			}
		} finally {
			posting = false;
		}
	}
</script>

<div style="border-top:1px solid var(--border);padding:0.75rem 1rem;display:flex;flex-direction:column;gap:0.6rem">
	{#if loading}
		<div style="display:flex;justify-content:center;padding:0.5rem"><span class="spinner"></span></div>
	{:else if comments.length === 0}
		<div style="font-size:0.8rem;color:var(--text-muted)">No comments yet{commentCount > 0 ? ` (${commentCount})` : ''}.</div>
	{:else}
		{#each comments as comment (comment.id)}
			<div style="display:flex;gap:0.5rem;align-items:flex-start">
				{#if comment.author.avatarUrl}
					<img src={comment.author.avatarUrl} alt={comment.author.handle} class="avatar" style="width:28px;height:28px" />
				{:else}
					<div class="avatar-placeholder" style="width:28px;height:28px;font-size:0.75rem">{comment.author.displayName[0]}</div>
				{/if}
				<div style="flex:1">
					<span style="font-weight:600;font-size:0.825rem">{comment.author.displayName}</span>
					<span style="font-size:0.85rem;margin-left:0.35rem">{comment.body}</span>
				</div>
			</div>
		{/each}
	{/if}

	<form onsubmit={submit} style="display:flex;gap:0.5rem">
		<input class="input" type="text" placeholder="Add a comment..." bind:value={body} style="flex:1" />
		<button type="submit" class="btn btn-secondary btn-sm" disabled={posting || !body.trim()}>Send</button>
	</form>
</div>
