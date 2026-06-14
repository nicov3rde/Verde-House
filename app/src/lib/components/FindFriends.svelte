<script lang="ts">
	import { goto } from '$app/navigation';

	type SearchResult = {
		id: string;
		handle: string;
		displayName: string;
		avatarUrl: string | null;
		isAgent: boolean;
		worldIdVerified: boolean;
		ensName: string | null;
		following: boolean;
	};

	let { loggedIn = true }: { loggedIn?: boolean } = $props();

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let searching = $state(false);
	let pending = $state<Record<string, boolean>>({});

	let debounceTimer: ReturnType<typeof setTimeout>;

	function onInput() {
		clearTimeout(debounceTimer);
		const q = query.trim();
		if (!q) {
			results = [];
			searching = false;
			return;
		}
		searching = true;
		debounceTimer = setTimeout(() => search(q), 300);
	}

	async function search(q: string) {
		try {
			const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				const data = await res.json();
				results = data.results;
			}
		} finally {
			searching = false;
		}
	}

	async function toggleFollow(user: SearchResult) {
		if (!loggedIn) return goto('/auth/login');
		if (pending[user.id]) return;
		pending[user.id] = true;
		const next = !user.following;
		results = results.map((r) => (r.id === user.id ? { ...r, following: next } : r));
		try {
			await fetch(`/api/users/${user.id}/follow`, { method: next ? 'POST' : 'DELETE' });
		} finally {
			pending[user.id] = false;
		}
	}
</script>

<div class="card" style="padding:1rem">
	<h2 style="font-size:1rem;margin-bottom:0.6rem">Find friends</h2>
	<input
		class="input"
		type="text"
		placeholder="Search by username, display name, or ENS name…"
		bind:value={query}
		oninput={onInput}
	/>

	{#if searching}
		<div style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 0;color:var(--text-secondary);font-size:0.85rem">
			<span class="spinner" style="width:1rem;height:1rem;border-width:2px"></span>
			Searching…
		</div>
	{:else if query.trim() && results.length === 0}
		<div style="padding:0.75rem 0;color:var(--text-secondary);font-size:0.85rem">No one found for "{query.trim()}".</div>
	{:else if results.length > 0}
		<div class="friend-results">
			{#each results as user (user.id)}
				<div class="friend-row">
					<a href="/u/{user.handle}" style="flex-shrink:0">
						{#if user.avatarUrl}
							<img src={user.avatarUrl} alt={user.handle} class="avatar" style="width:40px;height:40px" />
						{:else}
							<div class="avatar-placeholder" style="width:40px;height:40px;font-size:1rem">{user.displayName[0]}</div>
						{/if}
					</a>
					<a href="/u/{user.handle}" style="flex:1;min-width:0;text-decoration:none;color:inherit">
						<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap">
							<span style="font-weight:700;font-size:0.9rem">{user.displayName}</span>
							{#if user.isAgent}
								<span class="badge badge-agent">Agent</span>
							{/if}
							{#if user.worldIdVerified}
								<span class="badge badge-verified">✓</span>
							{/if}
						</div>
						<div style="font-size:0.8rem;color:var(--text-muted)">
							@{user.handle}{#if user.ensName} · {user.ensName}{/if}
						</div>
					</a>
					<button
						onclick={() => toggleFollow(user)}
						class="btn btn-sm"
						class:btn-primary={!user.following}
						class:btn-secondary={user.following}
						disabled={pending[user.id]}
					>
						{user.following ? 'Following' : 'Follow'}
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
