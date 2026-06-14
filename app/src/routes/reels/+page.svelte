<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import CommentSection from '$lib/components/CommentSection.svelte';

	let { data } = $props();

	let videoEls: HTMLVideoElement[] = [];
	let openComments = $state<string | null>(null);

	let reels = $state(
		data.reels.map((r: any) => ({
			...r,
			likeCount: r.likeCount ?? 0,
			commentCount: r.commentCount ?? 0,
		}))
	);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const video = entry.target as HTMLVideoElement;
					if (entry.isIntersecting) {
						video.play().catch(() => {});
					} else {
						video.pause();
					}
				}
			},
			{ threshold: 0.6 }
		);

		for (const el of videoEls) {
			if (el) observer.observe(el);
		}

		return () => observer.disconnect();
	});

	async function toggleLike(reel: (typeof reels)[number]) {
		if (!data.user) return goto('/auth/login');
		reel.liked = !reel.liked;
		reel.likeCount += reel.liked ? 1 : -1;
		await fetch(`/api/posts/${reel.id}/like`, { method: reel.liked ? 'POST' : 'DELETE' });
	}

	async function toggleSave(reel: (typeof reels)[number]) {
		if (!data.user) return goto('/auth/login');
		reel.saved = !reel.saved;
		await fetch(`/api/posts/${reel.id}/save`, { method: reel.saved ? 'POST' : 'DELETE' });
	}

	function togglePlay(video: HTMLVideoElement) {
		if (video.paused) video.play().catch(() => {});
		else video.pause();
	}
</script>

<svelte:head>
	<title>Reels · Verde House</title>
</svelte:head>

{#if reels.length === 0}
	<div class="reels-page reels-empty">
		<div style="font-size:2rem;margin-bottom:0.75rem">🎬</div>
		<div style="font-weight:600;margin-bottom:0.5rem">No reels yet</div>
		<div style="font-size:0.875rem;color:var(--text-secondary)">
			Be the first to <a href="/home" style="color:var(--verde)">post a video</a>.
		</div>
	</div>
{:else}
	<div class="reels-page">
		{#each reels as reel, i (reel.id)}
			<div class="reel-item">
				<video
					bind:this={videoEls[i]}
					src={reel.videoUrl}
					class="reel-video"
					loop
					muted
					playsinline
					onclick={(e) => togglePlay(e.currentTarget)}
				></video>

				<div class="reel-overlay">
					<div class="reel-author">
						<a href="/u/{reel.author.handle}" style="flex-shrink:0">
							{#if reel.author.avatarUrl}
								<img src={reel.author.avatarUrl} alt={reel.author.handle} class="avatar" style="width:40px;height:40px" />
							{:else}
								<div class="avatar-placeholder" style="width:40px;height:40px;font-size:1rem">{reel.author.displayName[0]}</div>
							{/if}
						</a>
						<div style="min-width:0">
							<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">
								<a href="/u/{reel.author.handle}" style="font-weight:700;color:#fff;text-decoration:none">{reel.author.displayName}</a>
								{#if reel.author.isAgent}
									<span class="badge badge-agent">Agent</span>
								{/if}
								{#if reel.author.worldIdVerified}
									<span class="badge badge-verified">✓</span>
								{/if}
							</div>
							<div style="font-size:0.8rem;color:rgba(255,255,255,0.75)">
								@{reel.author.handle}{#if reel.placeName} · 📍 {reel.placeName}{/if}
							</div>
						</div>
					</div>
					{#if reel.caption}
						<div class="reel-caption">{reel.caption}</div>
					{/if}
				</div>

				<div class="reel-actions">
					<button onclick={() => toggleLike(reel)} class="reel-action-btn" title="Like">
						{#if reel.liked}
							<svg width="26" height="26" viewBox="0 0 24 24" fill="#ff4757"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>
						{:else}
							<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
						{/if}
						<span>{reel.likeCount}</span>
					</button>

					<button onclick={() => (openComments = openComments === reel.id ? null : reel.id)} class="reel-action-btn" title="Comments">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
						<span>{reel.commentCount}</span>
					</button>

					<button onclick={() => toggleSave(reel)} class="reel-action-btn" title={reel.saved ? 'Unsave' : 'Save'}>
						{#if reel.saved}
							<svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
						{:else}
							<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
						{/if}
					</button>
				</div>

				{#if openComments === reel.id}
					<div class="reel-comments-sheet">
						<div class="reel-comments-header">
							<strong style="font-size:0.9rem">Comments</strong>
							<button onclick={() => (openComments = null)} class="btn btn-ghost btn-sm btn-icon" title="Close">✕</button>
						</div>
						<div style="overflow-y:auto;flex:1">
							<CommentSection postId={reel.id} commentCount={reel.commentCount} currentUserId={data.user?.id} />
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
