<script lang="ts">
	import PostGrid from '$lib/components/PostGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Explore · Verde House</title>
</svelte:head>

<div class="profile-col">
	<h1 style="font-size:1.3rem">Explore</h1>

	{#if data.explorePosts.length === 0}
		<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
			<div style="font-size:2rem;margin-bottom:0.75rem">🌍</div>
			<div style="font-weight:600;margin-bottom:0.5rem">Nothing to explore yet</div>
			<div style="font-size:0.875rem">Be the first to <a href="/" style="color:var(--verde)">share something</a>.</div>
		</div>
	{:else}
		<PostGrid posts={data.explorePosts} currentUserId={data.user.id} />
	{/if}
</div>
