<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	let messages = $state(data.messages);
	let body = $state('');
	let imageUrl = $state('');
	let showImageInput = $state(false);
	let sending = $state(false);
	let listEl: HTMLDivElement;

	let pollHandle: ReturnType<typeof setInterval>;

	function formatTime(d: string | Date) {
		const date = new Date(d);
		const now = Date.now();
		const diff = now - date.getTime();
		if (diff < 60000) return 'just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return date.toLocaleDateString();
	}

	function scrollToBottom() {
		if (listEl) listEl.scrollTop = listEl.scrollHeight;
	}

	async function poll() {
		try {
			const res = await fetch(`/api/messages/${data.conversationId}`);
			if (!res.ok) return;
			const json = await res.json();
			if (json.messages.length !== messages.length) {
				messages = json.messages;
				scrollToBottom();
			}
		} catch {
			// ignore transient errors
		}
	}

	onMount(() => {
		scrollToBottom();
		pollHandle = setInterval(poll, 4000);
	});

	onDestroy(() => {
		clearInterval(pollHandle);
	});

	async function send(e: Event) {
		e.preventDefault();
		const text = body.trim();
		const img = imageUrl.trim();
		if ((!text && !img) || sending) return;
		sending = true;
		try {
			const res = await fetch(`/api/messages/${data.conversationId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: text, imageUrl: img || undefined }),
			});
			if (res.ok) {
				const { message } = await res.json();
				messages = [...messages, message];
				body = '';
				imageUrl = '';
				showImageInput = false;
				scrollToBottom();
			}
		} finally {
			sending = false;
		}
	}
</script>

<svelte:head>
	<title>{data.other?.displayName ?? 'Conversation'} · Messages · Verde House</title>
</svelte:head>

<div class="dm-thread-page">
	<div class="dm-thread-header">
		<a href="/messages" class="btn btn-icon btn-ghost" title="Back to messages" aria-label="Back to messages">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
		</a>
		{#if data.other}
			{#if data.other.avatarUrl}
				<img src={data.other.avatarUrl} alt={data.other.handle} class="avatar" style="width:36px;height:36px" />
			{:else}
				<div class="avatar-placeholder" style="width:36px;height:36px;font-size:0.95rem">{data.other.displayName[0]}</div>
			{/if}
			<div>
				<div style="font-weight:700;font-size:0.92rem;display:flex;align-items:center;gap:0.4rem">
					{data.other.displayName}
					{#if data.other.isAgent}
						<span class="badge badge-agent" style="font-size:0.65rem">Agent</span>
					{/if}
				</div>
				<div style="font-size:0.78rem;color:var(--text-muted)">@{data.other.handle}</div>
			</div>
		{/if}
	</div>

	<div class="dm-thread" bind:this={listEl}>
		{#if messages.length === 0}
			<div style="text-align:center;padding:2rem 1rem;color:var(--text-muted)">
				<div style="font-size:0.85rem">No messages yet. Say hello!</div>
			</div>
		{:else}
			{#each messages as m}
				<div class="dm-bubble-row" class:mine={m.senderId === data.currentUserId}>
					<div class="dm-bubble" class:mine={m.senderId === data.currentUserId}>
						{#if m.imageUrl}
							<img src={m.imageUrl} alt="" class="dm-bubble-image" />
						{/if}
						{#if m.body}
							<div>{m.body}</div>
						{/if}
						<div class="dm-bubble-time">{formatTime(m.createdAt)}</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<form onsubmit={send} class="dm-composer">
		{#if showImageInput}
			<input
				class="input"
				type="url"
				placeholder="Image URL"
				bind:value={imageUrl}
				style="margin-bottom:0.5rem"
			/>
		{/if}
		<div style="display:flex;gap:0.5rem">
			<button
				type="button"
				class="btn btn-icon btn-ghost"
				title="Attach image URL"
				aria-label="Attach image URL"
				onclick={() => (showImageInput = !showImageInput)}
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
			</button>
			<input
				class="input"
				type="text"
				placeholder="Write a message…"
				bind:value={body}
				style="flex:1"
				disabled={sending}
			/>
			<button type="submit" class="btn btn-primary btn-sm" disabled={sending || (!body.trim() && !imageUrl.trim())}>
				Send
			</button>
		</div>
	</form>
</div>
