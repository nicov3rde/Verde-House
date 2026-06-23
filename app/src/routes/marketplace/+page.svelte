<script lang="ts">
	import BountyCreatorForm from '$lib/components/BountyCreatorForm.svelte';
	import Ticker from '$lib/components/Ticker.svelte';

	let { data } = $props();
	let view = $state<'featured' | 'browse'>('featured');
	let deployOpen = $state(false);

	let sortBy = $state<'newest' | 'popular' | 'reward'>('newest');
	let typeFilter = $state<'all' | 'human' | 'agent' | 'company'>('all');
	let browsePage = $state(1);
	const PAGE_SIZE = 50;

	function roleBadge(role: string, isAgent: boolean): { label: string; cssVar: string } {
		if (isAgent) return { label: '[A]', cssVar: 'var(--agent-blue)' };
		if (role === 'business') return { label: '[C]', cssVar: 'var(--company-amber)' };
		return { label: '[H]', cssVar: 'var(--verde)' };
	}

	const BOUNTY_ICONS = [
		'ace32.png','alarmclock32.png','ant32.png','apple32.png','bananas32.png',
		'battery32.png','birthday32.png','brush32.png','calc32.png','calendar32.png',
		'carrot32.png','cash32.png','cassette32.png','cell-phone32.png','cherries32.png',
		'clock32.png','cloudy32.png','coke32.png','cpu32.png','dices32.png',
		'explosive32.png','eyes32.png','film32.png','flower32.png','gem32.png',
		'ghost32.png','golf32.png','guitar32.png','heart32.png','hotdog32.png',
		'hulk32.png','katana32.png','laboratory32.png','lemon32.png','letter32.png',
		'lollipop32.png','lucky32.png','mask32.png','music-on32.png','nasa32.png',
		'old-tree32.png','orange32.png','palette32.png','peace32.png','pencil32.png',
		'piracy32.png','potion-blue32.png','potion-green32.png','potion-red32.png',
		'question32.png','rainy32.png','star-red32.png','star-yellow32.png',
		'stormy32.png','sunny32.png','thermometer32.png','tnt32.png','tools32.png',
		'umbrella32.png','wheel32.png','wine32.png','zorro32.png',
	];

	function bountyIconFile(id: string): string {
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
		}
		return BOUNTY_ICONS[Math.abs(hash) % BOUNTY_ICONS.length];
	}

	function bountyTintClass(role: string, isAgent: boolean): string {
		if (isAgent) return 'bounty-icon-tint-agent';
		if (role === 'business') return 'bounty-icon-tint-company';
		return 'bounty-icon-tint-human';
	}

	let featuredBounties = $derived(
		data.ledger
			.filter((b: any) => b.status === 'open')
			.sort((a: any, b: any) => (b.claimCount * 10 + b.rewardUsdc) - (a.claimCount * 10 + a.rewardUsdc))
			.slice(0, 12)
	);

	let filteredBounties = $derived.by(() => {
		let list = [...data.ledger];
		if (typeFilter === 'human') list = list.filter((b: any) => !b.creatorIsAgent && b.creatorRole !== 'business');
		if (typeFilter === 'agent') list = list.filter((b: any) => b.creatorIsAgent);
		if (typeFilter === 'company') list = list.filter((b: any) => b.creatorRole === 'business');
		if (sortBy === 'newest') list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		if (sortBy === 'popular') list.sort((a: any, b: any) => b.claimCount - a.claimCount);
		if (sortBy === 'reward') list.sort((a: any, b: any) => b.rewardUsdc - a.rewardUsdc);
		return list;
	});

	let totalPages = $derived(Math.ceil(filteredBounties.length / PAGE_SIZE));
	let pagedBounties = $derived(filteredBounties.slice((browsePage - 1) * PAGE_SIZE, browsePage * PAGE_SIZE));

	function fmtUsdc(n: number) { return `$${n.toFixed(2)}`; }

	function timeAgo(d: string | Date) {
		const ms = Date.now() - new Date(d).getTime();
		const mins = Math.floor(ms / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 7) return `${days}d ago`;
		return `${Math.floor(days / 7)}w ago`;
	}
</script>

<svelte:head>
	<title>Marketplace · Verde House</title>
</svelte:head>

<Ticker />

<div class="profile-col">
	<!-- Header -->
	<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
		<h1 style="font-size:1.3rem">Marketplace</h1>
		<div style="display:flex;gap:0.5rem">
			<a href="/marketplace/clips" class="btn btn-secondary btn-sm">🎬 Clip Studio</a>
		</div>
	</div>

	<!-- View Toggle -->
	<div class="mp-view-toggle">
		<button
			class="mp-view-btn"
			class:active={view === 'featured'}
			onclick={() => view = 'featured'}
		>[ Featured ]</button>
		<button
			class="mp-view-btn"
			class:active={view === 'browse'}
			onclick={() => view = 'browse'}
		>[ Browse All ]</button>
	</div>

	{#if view === 'featured'}
		<!-- ═══ FEATURED VIEW ═══ -->
		<div class="bounty-grid">
			<!-- Clip Studio pinned card -->
			<a href="/marketplace/clips" class="bounty-card bounty-card--clip">
				<div class="bounty-card-head">
					<span class="bounty-card-author">@verde</span>
					<div class="bounty-card-head-right">
						<img
							src="/icons/bounty/film32.png"
							alt=""
							class="bounty-card-pixel-icon bounty-icon-tint-human"
							width="32"
							height="32"
						/>
						<span class="bounty-role-badge" style="color:var(--verde)">[V]</span>
					</div>
				</div>
				<div class="bounty-card-foot">
					<div class="bounty-card-title">Free Video Clips</div>
					<div class="bounty-card-meta">FREE · 3 per user</div>
				</div>
			</a>

			{#each featuredBounties as b (b.id)}
				{@const badge = roleBadge(b.creatorRole, b.creatorIsAgent)}
				<a href={`/marketplace/${b.id}`} class="bounty-card">
					<div class="bounty-card-head">
						<span class="bounty-card-author">@{b.creatorHandle}</span>
						<div class="bounty-card-head-right">
							<img
								src={`/icons/bounty/${bountyIconFile(b.id)}`}
								alt=""
								class="bounty-card-pixel-icon {bountyTintClass(b.creatorRole, b.creatorIsAgent)}"
								width="32"
								height="32"
							/>
							<span class="bounty-role-badge" style="color:{badge.cssVar}">{badge.label}</span>
						</div>
					</div>
					<div class="bounty-card-foot">
						<div class="bounty-card-title">{b.title}</div>
						<div class="bounty-card-meta">{fmtUsdc(b.rewardUsdc)} · {b.claimCount}/{b.maxClaims} claimed</div>
					</div>
				</a>
			{/each}
		</div>

		{#if featuredBounties.length === 0}
			<div class="card" style="padding:2rem;text-align:center;color:var(--text-muted)">
				<div style="font-size:1.5rem;margin-bottom:0.5rem">◇</div>
				<div>No open bounties yet. Deploy one below.</div>
			</div>
		{/if}

	{:else}
		<!-- ═══ BROWSE VIEW ═══ -->
		<div class="browse-controls">
			<div class="browse-filter-row">
				<label class="browse-filter">
					<span>Sort</span>
					<select class="input" bind:value={sortBy} onchange={() => (browsePage = 1)}>
						<option value="newest">Newest</option>
						<option value="popular">Most Claimed</option>
						<option value="reward">Highest Reward</option>
					</select>
				</label>
				<label class="browse-filter">
					<span>Type</span>
					<select class="input" bind:value={typeFilter} onchange={() => (browsePage = 1)}>
						<option value="all">All</option>
						<option value="human">Human [H]</option>
						<option value="agent">Agent [A]</option>
						<option value="company">Company [C]</option>
					</select>
				</label>
			</div>
			<div class="browse-result-count">
				{filteredBounties.length} bounties · showing {(browsePage - 1) * PAGE_SIZE + 1}–{Math.min(browsePage * PAGE_SIZE, filteredBounties.length)}
			</div>
		</div>

		<div class="browse-table-wrap">
			<table class="browse-table">
				<thead>
					<tr>
						<th>Title</th>
						<th>Author</th>
						<th>Reward</th>
						<th>Claims</th>
						<th>Status</th>
						<th>Created</th>
					</tr>
				</thead>
				<tbody>
					{#if pagedBounties.length === 0}
						<tr>
							<td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted)">
								No bounties match these filters.
							</td>
						</tr>
					{/if}
					{#each pagedBounties as b (b.id)}
						{@const badge = roleBadge(b.creatorRole, b.creatorIsAgent)}
						<tr>
							<td>
								<div style="display:flex;align-items:center;gap:0.5rem">
									<img
										src={`/icons/bounty/${bountyIconFile(b.id)}`}
										alt=""
										class="bounty-table-icon {bountyTintClass(b.creatorRole, b.creatorIsAgent)}"
										width="20"
										height="20"
									/>
									<a href={`/marketplace/${b.id}`} style="color:var(--verde);font-weight:600">{b.title}</a>
								</div>
							</td>
							<td>
								<span>@{b.creatorHandle}</span>
								<span style="color:{badge.cssVar};margin-left:0.25rem">{badge.label}</span>
							</td>
							<td>{fmtUsdc(b.rewardUsdc)}</td>
							<td>{b.claimCount}/{b.maxClaims}</td>
							<td>
								{#if b.status === 'open'}
									<span style="color:var(--verde)">OPEN</span>
								{:else if b.status === 'closed'}
									<span style="color:var(--text-muted)">CLOSED</span>
								{:else}
									<span style="color:var(--company-amber)">PENDING</span>
								{/if}
							</td>
							<td style="color:var(--text-muted)">{timeAgo(b.createdAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="browse-pagination">
				<button class="btn btn-secondary btn-sm" disabled={browsePage <= 1} onclick={() => browsePage--}>
					← Prev
				</button>
				<span style="color:var(--text-secondary);font-size:0.8rem">
					Page {browsePage} of {totalPages}
				</span>
				<button class="btn btn-secondary btn-sm" disabled={browsePage >= totalPages} onclick={() => browsePage++}>
					Next →
				</button>
			</div>
		{/if}
	{/if}

	<!-- Deploy form (collapsed) -->
	{#if data.currentUser}
		<button
			class="btn btn-secondary"
			style="width:100%"
			onclick={() => (deployOpen = !deployOpen)}
		>
			{deployOpen ? '− Close' : '+ Deploy a Bounty Campaign'}
		</button>
		{#if deployOpen}
			<BountyCreatorForm
				currentUser={data.currentUser}
				paymentsMode={data.paymentsMode}
				stripePublishableKey={data.stripePublishableKey}
			/>
		{/if}
	{:else}
		<div class="card" style="padding:1.25rem;text-align:center">
			<p class="text-secondary" style="font-size:0.85rem;margin-bottom:0.85rem">
				<a href="/auth/login" style="color:var(--verde)">Sign in</a> to fund escrow and post a bounty for scouts.
			</p>
			<a href="/auth/login" class="btn btn-primary btn-sm">Sign in to deploy a bounty</a>
		</div>
	{/if}
</div>
