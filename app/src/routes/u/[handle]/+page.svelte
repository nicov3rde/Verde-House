<script lang="ts">
	import { goto } from '$app/navigation';
	import PostGrid from '$lib/components/PostGrid.svelte';

	let { data } = $props();

	let following = $state(data.isFollowing);
	let followerCount = $state(data.followerCount);
	let pending = $state(false);
	let messaging = $state(false);

	async function messageUser() {
		if (!data.user) return goto('/auth/login');
		if (messaging) return;
		messaging = true;
		try {
			const res = await fetch('/api/messages/conversations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: data.profileUser.id }),
			});
			if (res.ok) {
				const { id } = await res.json();
				goto(`/messages/${id}`);
			}
		} finally {
			messaging = false;
		}
	}

	async function toggleFollow() {
		if (!data.user) return goto('/auth/login');
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

	const expertiseCategories = [
		{ key: 'pizza', label: 'Pizza Exp', emoji: '🍕' },
		{ key: 'coffee', label: 'Coffee Exp', emoji: '☕' },
		{ key: 'nightlife', label: 'Nightlife', emoji: '🌃' },
		{ key: 'localTrust', label: 'Local Trust', emoji: '📍' },
	] as const;

	const reliabilityBreakdown = [
		{ key: 'worldId', label: 'World ID', emoji: '🪪', max: 25 },
		{ key: 'accountAge', label: 'Account age', emoji: '📅', max: 20 },
		{ key: 'verifiedVisits', label: 'Verified visits', emoji: '✓', max: 30 },
		{ key: 'bountiesPaid', label: 'Bounties paid', emoji: '🎯', max: 25 },
	] as const;

	const authorityBreakdown = [
		{ key: 'postRank', label: 'Net post rank', emoji: '📈', max: 50 },
		{ key: 'vouchesReceived', label: 'Vouches received', emoji: '🤝', max: 30 },
		{ key: 'vouchesGiven', label: 'Vouches given', emoji: '🙌', max: 20 },
	] as const;

	function shorten(hash: string | null) {
		if (!hash) return '—';
		return hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
	}
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
				{#if data.chainProfile.worldId.verified}
					<span class="badge badge-verified">
						<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
						World ID: Verified
					</span>
				{/if}
				{#if data.chainProfile.ens.name}
					<span class="badge badge-ens">{data.chainProfile.ens.name}</span>
				{/if}
				{#if data.chainProfile.unlink.privacyActive}
					<span class="badge badge-unlink">
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
						Privacy Active
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

			<div style="margin-top:1rem;display:flex;gap:0.5rem">
				{#if data.isOwnProfile}
					<a href="/settings" class="btn btn-secondary btn-sm">Edit profile</a>
				{:else}
					<button onclick={toggleFollow} class="btn btn-sm" class:btn-primary={!following} class:btn-secondary={following} disabled={pending}>
						{following ? 'Following' : 'Follow'}
					</button>
					<button onclick={messageUser} class="btn btn-secondary btn-sm" disabled={messaging}>
						Message
					</button>
				{/if}
			</div>
		</div>
	</div>

	<div class="card" style="padding:1.25rem">
		<h2 style="font-size:1.05rem;margin-bottom:0.25rem">Reliability &amp; Expertise</h2>
		<p class="text-secondary" style="font-size:0.8rem;margin-bottom:0.85rem">
			{#if data.chainProfile.ens.name}
				Synced to {data.chainProfile.ens.name}'s ENS text records.
			{:else}
				Set an ENS name in settings to mirror these as on-chain text records.
			{/if}
		</p>

		<div class="reliability-score">
			<div class="reliability-score-num">{data.chainProfile.reliability.total}<span>/100</span></div>
			<div style="flex:1;min-width:160px">
				<div class="reliability-score-label">Reliability Score</div>
				<div class="reliability-score-breakdown">
					{#each reliabilityBreakdown as b}
						<span title="{b.label}: {data.chainProfile.reliability.breakdown[b.key]}/{b.max}">
							{b.emoji} {data.chainProfile.reliability.breakdown[b.key]}
						</span>
					{/each}
				</div>
			</div>
		</div>

		<div class="reliability-grid">
			{#each expertiseCategories as c}
				<div class="reliability-card">
					<div class="reliability-num">{data.chainProfile.ens.expertise[c.key]}</div>
					<div class="reliability-label">{c.emoji} {c.label}</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="card" style="padding:1.25rem">
		<h2 style="font-size:1.05rem;margin-bottom:0.25rem">Authority Score</h2>
		<p class="text-secondary" style="font-size:0.8rem;margin-bottom:0.85rem">
			The Peer Ranking Engine's measure of community trust — earned from post votes and bounty-claim vouches.
		</p>

		<div class="reliability-score">
			<div class="authority-score-num">{data.chainProfile.authority.total}<span>/100</span></div>
			<div style="flex:1;min-width:160px">
				<div class="reliability-score-label">Authority Score</div>
				<div class="reliability-score-breakdown">
					{#each authorityBreakdown as b}
						<span title="{b.label}: {data.chainProfile.authority.breakdown[b.key]}/{b.max}">
							{b.emoji} {data.chainProfile.authority.breakdown[b.key]}
						</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	{#if data.isOwnProfile && data.shieldedBalance}
		<div class="card" style="padding:1.25rem">
			<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap">
				<h2 style="font-size:1.05rem">🔒 Shielded Balance</h2>
				<span class="badge badge-unlink">Unlink {data.shieldedBalance.mode === 'live' ? '· Live' : '· Preview'}</span>
			</div>

			{#if data.shieldedBalance.privacyActive}
				<div style="font-size:1.8rem;font-weight:700;letter-spacing:0.15em;margin-top:0.6rem;font-family:monospace">●●●●●● USDC</div>
				<p class="text-secondary" style="font-size:0.8rem;margin-top:0.5rem;line-height:1.5">
					Privacy mode is on — your total bounty earnings are withheld from this page's data entirely; only you can see the figure.
					{#if data.shieldedBalance.mode === 'stub'}
						Unlink isn't connected yet, so this is a preview of the shielded layout: the number is omitted server-side today, with no ZK proof behind it yet.
					{/if}
				</p>
			{:else}
				<div style="font-size:1.8rem;font-weight:700;margin-top:0.6rem">${data.shieldedBalance.totalUsdc?.toFixed(2)} USDC</div>
				<p class="text-secondary" style="font-size:0.8rem;margin-top:0.5rem;line-height:1.5">
					Total earned from bounty payouts. Turn on Privacy Mode in <a href="/settings">Settings</a> to withhold this figure from page data via Unlink.
				</p>
			{/if}
		</div>
	{/if}

	<div class="divider"></div>

	{#if data.posts.length === 0}
		<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
			<div style="font-size:2rem;margin-bottom:0.75rem">📭</div>
			<div style="font-weight:600">No posts yet</div>
		</div>
	{:else}
		<PostGrid posts={data.posts} currentUserId={data.user?.id} />
	{/if}

	<div class="divider"></div>

	<div class="card" style="padding:1.25rem">
		<h2 style="font-size:0.8rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-secondary);margin-bottom:0.85rem">
			Powered by
		</h2>
		<div class="tech-grid">
			<div class="tech-card">
				<div class="tech-card-header">
					<span class="tech-name" style="color:var(--world-blue)">World Stack</span>
					<span class="tech-status-dot" class:stub={!data.chainProfile.worldId.verified}></span>
				</div>
				<p class="tech-desc">World ID verifies personhood; AgentKit runs autonomous trust-verification agents on-chain.</p>
				<div class="tech-detail">
					{#if data.chainProfile.worldId.verified}
						Nullifier {shorten(data.chainProfile.worldId.nullifierHash)}
					{:else}
						Not yet verified
					{/if}
				</div>
			</div>

			<div class="tech-card">
				<div class="tech-card-header">
					<span class="tech-name" style="color:var(--unlink-purple)">Unlink SDK</span>
					<span class="tech-status-dot" class:stub={!data.chainProfile.unlink.privacyActive}></span>
				</div>
				<p class="tech-desc">Private USDC balances &amp; transfers — hides earnings behind ZK proofs.</p>
				<div class="tech-detail">
					{data.chainProfile.unlink.privacyActive ? 'Shielded balances active' : 'Privacy mode off'}
				</div>
			</div>

			<div class="tech-card">
				<div class="tech-card-header">
					<span class="tech-name" style="color:var(--ens-cyan)">ENS Identity</span>
					<span class="tech-status-dot" class:stub={!data.chainProfile.ens.name}></span>
				</div>
				<p class="tech-desc">Portable on-chain identity. Expertise scores mirror to ENS text records.</p>
				<div class="tech-detail">
					{data.chainProfile.ens.name ?? 'No ENS name set'}
				</div>
			</div>

			<div class="tech-card">
				<div class="tech-card-header">
					<span class="tech-name" style="color:var(--arc-gold)">Arc L1</span>
					<span class="tech-status-dot" class:stub={data.chainProfile.arc.mode !== 'live'}></span>
				</div>
				<p class="tech-desc">Circle's purpose-built L1 — settles USDC bounty payouts at low cost.</p>
				<div class="tech-detail">
					{#if data.chainProfile.arc.mode === 'live'}
						Verified payouts settle on Arc
					{:else}
						Verified payouts get a settlement hash recorded — not yet broadcast on-chain (ARC_RPC_URL not set)
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
