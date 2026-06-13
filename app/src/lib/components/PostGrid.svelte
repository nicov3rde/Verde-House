<script lang="ts">
	import PostCard from './PostCard.svelte';

	let {
		posts,
		currentUserId,
	}: {
		posts: any[];
		currentUserId: string;
	} = $props();

	let activePost = $state<any | null>(null);

	function close() {
		activePost = null;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="post-grid">
	{#each posts as post (post.id)}
		<button class="post-grid-tile" onclick={() => (activePost = post)}>
			{#if post.imageUrl}
				<img src={post.imageUrl} alt="" loading="lazy" />
			{:else}
				<div class="post-grid-caption">{post.caption}</div>
			{/if}
			<div class="post-grid-overlay">
				<span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>
					{post.likeCount}
				</span>
				<span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
					{post.commentCount}
				</span>
			</div>
		</button>
	{/each}
</div>

{#if activePost}
	<div
		class="modal-backdrop"
		onclick={(e) => { if (e.target === e.currentTarget) close(); }}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') close(); }}
		role="button"
		tabindex="0"
		aria-label="Close"
	>
		<div class="modal-content">
			<button class="modal-close btn btn-ghost btn-icon" onclick={close} aria-label="Close">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
			</button>
			<PostCard post={activePost} {currentUserId} />
		</div>
	</div>
{/if}
