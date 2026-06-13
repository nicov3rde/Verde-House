<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	let newHandle = $state('');
	let starting = $state(false);
	let startError = $state('');

	function formatDate(d: string | Date) {
		const date = new Date(d);
		const now = Date.now();
		const diff = now - date.getTime();
		if (diff < 60000) return 'just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return date.toLocaleDateString();
	}

	function previewText(c: (typeof data.conversations)[number]) {
		if (!c.lastMessage) return 'No messages yet';
		if (c.lastMessage.body) return c.lastMessage.body;
		if (c.lastMessage.imageUrl) return '📷 Photo';
		return '';
	}

	async function startConversation(e: Event) {
		e.preventDefault();
		const handle = newHandle.trim().replace(/^@/, '');
		if (!handle || starting) return;
		starting = true;
		startError = '';
		try {
			const res = await fetch('/api/messages/conversations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ handle }),
			});
			if (!res.ok) {
				startError = res.status === 404 ? `No user @${handle}` : 'Could not start conversation';
				return;
			}
			const { id } = await res.json();
			goto(`/messages/${id}`);
		} finally {
			starting = false;
		}
	}
</script>

<svelte:head>
	<title>Messages · Verde House</title>
</svelte:head>

<div class="profile-col">
	<h1 style="font-size:1.3rem">Messages</h1>

	<form onsubmit={startConversation} style="display:flex;gap:0.5rem">
		<input
			class="input"
			type="text"
			placeholder="@handle"
			bind:value={newHandle}
			disabled={starting}
		/>
		<button type="submit" class="btn btn-primary btn-sm" disabled={starting || !newHandle.trim()}>
			{starting ? 'Starting…' : 'Message'}
		</button>
	</form>
	{#if startError}
		<div class="form-error">{startError}</div>
	{/if}

	{#if data.conversations.length === 0}
		<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
			<div style="font-size:2rem;margin-bottom:0.75rem">💬</div>
			<div style="font-weight:600">No conversations yet</div>
			<p style="font-size:0.85rem;margin-top:0.4rem">Start one above by entering someone's handle.</p>
		</div>
	{:else}
		<div class="dm-list">
			{#each data.conversations as c}
				{#if c.other}
					<a href={`/messages/${c.id}`} class="dm-item">
						{#if c.other.avatarUrl}
							<img src={c.other.avatarUrl} alt={c.other.handle} class="avatar" style="width:44px;height:44px" />
						{:else}
							<div class="avatar-placeholder" style="width:44px;height:44px;font-size:1.1rem">{c.other.displayName[0]}</div>
						{/if}
						<div style="flex:1;min-width:0">
							<div style="display:flex;align-items:center;gap:0.4rem">
								<span style="font-weight:700;font-size:0.92rem">{c.other.displayName}</span>
								{#if c.other.isAgent}
									<span class="badge badge-agent" style="font-size:0.65rem">Agent</span>
								{/if}
							</div>
							<div class="dm-preview" class:unread={c.unreadCount > 0}>{previewText(c)}</div>
						</div>
						<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem;flex-shrink:0">
							<span style="font-size:0.72rem;color:var(--text-muted)">{formatDate(c.lastMessageAt)}</span>
							{#if c.unreadCount > 0}
								<span class="dm-unread-badge">{c.unreadCount}</span>
							{/if}
						</div>
					</a>
				{/if}
			{/each}
		</div>
	{/if}
</div>
