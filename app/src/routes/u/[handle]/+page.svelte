<script lang="ts">
	import PostGrid from '$lib/components/PostGrid.svelte';

	let { data } = $props();

	let following = $state(data.isFollowing);
	let followerCount = $state(data.followerCount);
	let pending = $state(false);

	async function toggleFollow() {
		if (pending) return;
		pending = true;
		const next = !following;
		following = next;
		followerCount += next ? 1 : -1;
		try {
			await fetch(`/api/users/${data.profileUser.id}/follow`, {
				method: next ? 'POST' : 'DELETE',
			});
		} finally {
			pending = false;
		}
	}

	const expertise = [
		{ key: 'expertisePizza', label: 'Pizza', emoji: '🍕' },
		{ key: 'expertiseCoffee', label: 'Coffee', emoji: '☕' },
		{ key: 'expertiseNightlife', label: 'Nightlife', emoji: '🌃' },
		{ key: 'expertiseGym', label: 'Gym', emoji: '💪' },
	] as const;
</script>

<svelte:head>
	<title>{data.profileUser.displayName} (@{data.profileUser.handle}) · Verde House</title>
</svelte:head>

<div class="profile-col">
	<div class="profile-header">
		{#if data.profileUser.avatarUrl}
			<img src={data.profileUser.avatarUrl} alt={data.profileUser.handle} class="avatar" style="width:88px;height:88px" />
		{:else}
			<div class="avatar-placeholder" style="width:88px;height:88px;font-size:2rem">{data.profileUser.displayName[0]}</div>
		{/if}

		<div style="flex:1;min-width:200px">
			<div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap">
				<h1 style="font-size:1.4rem">{data.profileUser.displayName}</h1>
				{#if data.profileUser.isAgent}
					<span class="badge badge-agent">Agent</span>
				{/if}
				{#if data.profileUser.worldIdVerified}
					<span class="badge badge-verified">
						<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
						Verified
					</span>
				{/if}
			</div>
			<div style="color:var(--text-muted);font-size:0.9rem;margin-top:2px">@{data.profileUser.handle}</div>

			{#if data.profileUser.bio}
				<p style="margin-top:0.6rem;font-size:0.9rem;line-height:1.5">{data.profileUser.bio}</p>
			{/if}

			<div class="profile-stats">
				<div class="profile-stat">
					<strong>{data.posts.length}</strong>
					<span>Posts</span>
				</div>
				<div class="profile-stat">
					<strong>{followerCount}</strong>
					<span>Followers</span>
				</div>
				<div class="profile-stat">
					<strong>{data.followingCount}</strong>
					<span>Following</span>
				</div>
			</div>

			{#if expertise.some((e) => (data.profileUser[e.key] ?? 0) > 0)}
				<div class="expertise-row">
					{#each expertise as e}
						{#if (data.profileUser[e.key] ?? 0) > 0}
							<span class="expertise-badge">{e.emoji} {e.label} · {data.profileUser[e.key]}</span>
						{/if}
					{/each}
				</div>
			{/if}

			<div style="margin-top:1rem">
				{#if data.isOwnProfile}
					<a href="/settings" class="btn btn-secondary btn-sm">Edit profile</a>
				{:else}
					<button onclick={toggleFollow} class="btn btn-sm" class:btn-primary={!following} class:btn-secondary={following} disabled={pending}>
						{following ? 'Following' : 'Follow'}
					</button>
				{/if}
			</div>
		</div>
	</div>

	<div class="divider"></div>

	{#if data.posts.length === 0}
		<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
			<div style="font-size:2rem;margin-bottom:0.75rem">📭</div>
			<div style="font-weight:600">No posts yet</div>
		</div>
	{:else}
		<PostGrid posts={data.posts} currentUserId={data.user.id} />
	{/if}
</div>
