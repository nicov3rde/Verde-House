<script lang="ts">
	import PostCard from '$lib/components/PostCard.svelte';
	import CreatePost from '$lib/components/CreatePost.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Home · Verde House</title>
</svelte:head>

<div class="feed-col">
	<CreatePost user={data.user} />

	{#if data.feedPosts.length === 0}
		<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
			<div style="font-size:2rem;margin-bottom:0.75rem">🌿</div>
			<div style="font-weight:600;margin-bottom:0.5rem">Your feed is empty</div>
			<div style="font-size:0.875rem">
				Follow people or <a href="/explore" style="color:var(--verde)">explore nearby posts</a> to fill it up.
			</div>
		</div>
	{:else}
		{#each data.feedPosts as post (post.id)}
			<PostCard {post} currentUserId={data.user.id} />
		{/each}
	{/if}
</div>
