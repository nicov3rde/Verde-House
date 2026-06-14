<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import CommentSection from './CommentSection.svelte';

	let {
		post,
		currentUserId,
	}: {
		post: any;
		currentUserId?: string;
	} = $props();

	let liked = $state(post.liked ?? false);
	let likeCount = $state(post.likeCount ?? 0);
	let saved = $state(post.saved ?? false);
	let showComments = $state(false);
	let userRank = $state(post.userRank ?? 0);
	let rankScore = $state(post.rankScore ?? 0);

	async function toggleLike() {
		if (!currentUserId) return goto('/auth/login');
		liked = !liked;
		likeCount += liked ? 1 : -1;

		await fetch(`/api/posts/${post.id}/like`, {
			method: liked ? 'POST' : 'DELETE',
		});
	}

	async function vote(value: 1 | -1) {
		if (!currentUserId) return goto('/auth/login');
		const prevRank = userRank;
		const prevScore = rankScore;
		userRank = userRank === value ? 0 : value;
		rankScore += userRank - prevRank;

		try {
			const res = await fetch(`/api/posts/${post.id}/rank`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ value }),
			});
			if (!res.ok) throw new Error('Failed to vote');
			const data = await res.json();
			rankScore = data.rankScore;
			userRank = data.userRank;
		} catch {
			userRank = prevRank;
			rankScore = prevScore;
		}
	}

	async function toggleSave() {
		if (!currentUserId) return goto('/auth/login');
		saved = !saved;
		await fetch(`/api/posts/${post.id}/save`, {
			method: saved ? 'POST' : 'DELETE',
		});
	}

	function formatDate(d: string | Date) {
		const date = new Date(d);
		const now = Date.now();
		const diff = now - date.getTime();
		if (diff < 60000) return 'just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return date.toLocaleDateString();
	}
</script>

<article class="post-card">
	<!-- Header -->
	<div style="display:flex;align-items:center;gap:0.65rem;padding:0.75rem 1rem">
		<a href="/u/{post.author.handle}" style="flex-shrink:0">
			{#if post.author.avatarUrl}
				<img src={post.author.avatarUrl} alt={post.author.handle} class="avatar" style="width:36px;height:36px"/>
			{:else}
				<div class="avatar-placeholder" style="width:36px;height:36px;font-size:0.9rem">{post.author.displayName[0]}</div>
			{/if}
		</a>
		<div style="flex:1;min-width:0">
			<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">
				<a href="/u/{post.author.handle}" style="font-weight:700;font-size:0.9rem">{post.author.displayName}</a>
				<span style="color:var(--text-muted);font-size:0.8rem">@{post.author.handle}</span>
				{#if post.author.isAgent}
					<span class="badge badge-agent">Agent</span>
				{/if}
				{#if post.author.worldIdVerified}
					<span class="badge badge-verified">
						<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
						Verified
					</span>
				{/if}
			</div>
			<div style="display:flex;align-items:center;gap:0.5rem;margin-top:1px">
				{#if post.placeName}
					<span style="font-size:0.75rem;color:var(--text-secondary)">📍 {post.placeName}</span>
				{/if}
				{#if post.verifiedVisit}
					<span class="badge badge-verified" style="font-size:0.65rem">✓ Verified visit</span>
				{/if}
				{#if post.postType === 'sponsored'}
					<span class="badge badge-sponsored">Sponsored</span>
				{/if}
			</div>
		</div>
		<span style="font-size:0.75rem;color:var(--text-muted);flex-shrink:0">{formatDate(post.createdAt)}</span>
	</div>

	<!-- Media -->
	{#if post.videoUrl}
		<div style="position:relative">
			<video src={post.videoUrl} class="post-video" controls playsinline loop muted></video>
		</div>
	{:else if post.imageUrl}
		<div style="position:relative">
			<img src={post.imageUrl} alt="Post" class="post-image" />
		</div>
	{/if}

	<!-- Caption -->
	{#if post.caption}
		<div style="padding:0.6rem 1rem;font-size:0.9rem;line-height:1.5">{post.caption}</div>
	{/if}

	<!-- Actions -->
	<div style="display:flex;align-items:center;gap:0.25rem;padding:0.35rem 0.5rem;border-top:1px solid var(--border)">
		<div class="rank-control" title="Peer ranking">
			<button onclick={() => vote(1)} class="btn btn-ghost btn-sm btn-icon" class:rank-active-up={userRank === 1} title="Upvote">
				<svg width="14" height="14" viewBox="0 0 24 24" fill={userRank === 1 ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
			</button>
			<span class="rank-score" class:rank-active-up={userRank === 1} class:rank-active-down={userRank === -1}>{rankScore}</span>
			<button onclick={() => vote(-1)} class="btn btn-ghost btn-sm btn-icon" class:rank-active-down={userRank === -1} title="Downvote">
				<svg width="14" height="14" viewBox="0 0 24 24" fill={userRank === -1 ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
			</button>
		</div>

		<button onclick={toggleLike} class="btn btn-ghost btn-sm btn-icon" style="gap:0.35rem;font-size:0.85rem" title="Like">
			{#if liked}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="#ff4757"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
			{/if}
			{likeCount}
		</button>

		<button onclick={() => showComments = !showComments} class="btn btn-ghost btn-sm btn-icon" style="gap:0.35rem;font-size:0.85rem" title="Comment">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
			{post.commentCount}
		</button>

		<button onclick={toggleSave} class="btn btn-ghost btn-sm btn-icon" style="margin-left:auto" title={saved ? 'Unsave' : 'Save'}>
			{#if saved}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
			{/if}
		</button>
	</div>

	<!-- Comments section -->
	{#if showComments}
		<CommentSection postId={post.id} commentCount={post.commentCount} currentUserId={currentUserId} />
	{/if}
</article>

<script module>
	// Inline CommentSection to keep component count low
</script>
