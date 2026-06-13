<script lang="ts">
	let { data } = $props();

	function formatDate(d: string | Date) {
		const date = new Date(d);
		const now = Date.now();
		const diff = now - date.getTime();
		if (diff < 60000) return 'just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
		return date.toLocaleDateString();
	}

	function messageFor(item: any) {
		switch (item.type) {
			case 'like':
				return 'liked your post';
			case 'comment':
				return 'commented on your post';
			case 'follow':
				return 'started following you';
			case 'bounty_verified':
				return item.message ?? 'Your bounty claim was verified';
			case 'bounty_paid':
				return item.message ?? 'You were paid for a bounty';
			default:
				return item.message ?? 'sent you a notification';
		}
	}

	function linkFor(item: any) {
		if (item.type === 'follow' && item.actor?.handle) return `/u/${item.actor.handle}`;
		if ((item.type === 'like' || item.type === 'comment') && data.user?.handle) return `/u/${data.user.handle}`;
		return '/marketplace';
	}

	function iconFor(type: string) {
		switch (type) {
			case 'like':
				return { fill: '#ff4757', path: 'M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z' };
			case 'comment':
				return { fill: 'currentColor', path: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' };
			case 'follow':
				return { fill: 'currentColor', path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' };
			default:
				return { fill: 'currentColor', path: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0' };
		}
	}
</script>

<svelte:head>
	<title>Notifications · Verde House</title>
</svelte:head>

<div class="profile-col">
	<h1 style="font-size:1.3rem">Notifications</h1>

	{#if data.items.length === 0}
		<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
			<div style="font-size:2rem;margin-bottom:0.75rem">🔔</div>
			<div style="font-weight:600;margin-bottom:0.5rem">No notifications yet</div>
			<div style="font-size:0.875rem">Likes, comments, and new followers will show up here.</div>
		</div>
	{:else}
		<div class="card" style="display:flex;flex-direction:column">
			{#each data.items as item (item.id)}
				{@const icon = iconFor(item.type)}
				<a
					href={linkFor(item)}
					style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;border-bottom:1px solid var(--border)"
					class:notif-unread={!item.read}
				>
					{#if item.actor?.avatarUrl}
						<img src={item.actor.avatarUrl} alt={item.actor.handle} class="avatar" style="width:40px;height:40px" />
					{:else if item.actor}
						<div class="avatar-placeholder" style="width:40px;height:40px;font-size:1rem">{item.actor.displayName[0]}</div>
					{:else}
						<div class="avatar-placeholder" style="width:40px;height:40px">
							<svg width="18" height="18" viewBox="0 0 24 24" fill={icon.fill} stroke={icon.fill === 'currentColor' ? 'currentColor' : 'none'} stroke-width="2"><path d={icon.path}/></svg>
						</div>
					{/if}

					<div style="flex:1;min-width:0">
						<div style="font-size:0.9rem">
							{#if item.actor}
								<span style="font-weight:700">{item.actor.displayName}</span>
							{/if}
							{messageFor(item)}
						</div>
						<div style="font-size:0.75rem;color:var(--text-muted);margin-top:1px">{formatDate(item.createdAt)}</div>
					</div>

					{#if !item.read}
						<span class="notif-dot" style="margin-left:0;flex-shrink:0"></span>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.notif-unread {
		background: var(--verde-muted);
	}
	a:last-child {
		border-bottom: none !important;
	}
</style>
