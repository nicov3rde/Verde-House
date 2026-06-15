<script lang="ts">
	import BountyCreatorForm from '$lib/components/BountyCreatorForm.svelte';

	let { data } = $props();

	const statusLabel: Record<string, string> = {
		pending_payment: 'Pending Payment',
		open: 'Open',
		closed: 'Closed',
	};

	const statusBadgeClass: Record<string, string> = {
		pending_payment: 'badge-pending',
		open: 'badge-open',
		closed: 'badge-closed',
	};

	function fmtUsdc(n: number) {
		return `$${n.toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Bounties · Verde House</title>
</svelte:head>

<div class="profile-col">
	<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
		<h1 style="font-size:1.3rem">Bounties</h1>
		<a href="/marketplace/clips" class="btn btn-secondary btn-sm">🎬 Clip Studio</a>
	</div>

	<div class="card" style="padding:1.25rem">
		<h2 style="font-size:1.05rem;margin-bottom:0.75rem">Active Bounty Ledger</h2>

		{#if data.ledger.length === 0}
			<div style="text-align:center;padding:2rem 1rem;color:var(--text-muted)">
				<div style="font-size:2rem;margin-bottom:0.5rem">🛍️</div>
				<div style="font-weight:600">No bounty campaigns yet</div>
				<div style="font-size:0.85rem;margin-top:0.25rem">Deploy one below to see it here.</div>
			</div>
		{:else}
			<div class="ledger-table-wrap">
				<table class="ledger-table">
					<thead>
						<tr>
							<th>Campaign</th>
							<th>Brand</th>
							<th>Geo-Fence</th>
							<th>Reward</th>
							<th>Claims</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.ledger as b (b.id)}
							<tr>
								<td>
									<a href={`/marketplace/${b.id}`} style="font-weight:600;color:var(--text-primary)">{b.title}</a>
								</td>
								<td>{b.brand}</td>
								<td>
									{#if b.placeName}
										{b.placeName} · {b.radiusMiles}mi
									{:else}
										<span class="text-muted">—</span>
									{/if}
								</td>
								<td>{fmtUsdc(b.rewardUsdc)} USDC</td>
								<td>{b.claimCount} / {b.maxClaims}</td>
								<td>
									<span class="badge {statusBadgeClass[b.status] ?? ''}">{statusLabel[b.status] ?? b.status}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<div class="stat-grid">
		<div class="stat-card">
			<div class="stat-label">Total Campaigns</div>
			<div class="stat-value">{data.stats.totalCampaigns}</div>
			<div class="stat-sub">+{data.stats.newThisWeek} new this week</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Verified Submissions</div>
			<div class="stat-value">{data.stats.verifiedSubmissions}</div>
			<div class="stat-sub">{data.stats.humanRate}% human-rate</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Shielded Payouts</div>
			<div class="stat-value">{fmtUsdc(data.stats.shieldedPayoutsUsdc)} USDC</div>
			<div class="stat-sub">{data.stats.privatePayoutPct}% Unlink Private</div>
		</div>
	</div>

	{#if data.currentUser}
		<BountyCreatorForm
			currentUser={data.currentUser}
			paymentsMode={data.paymentsMode}
			stripePublishableKey={data.stripePublishableKey}
		/>
	{:else}
		<div class="card" style="padding:1.25rem;text-align:center">
			<h2 style="font-size:1.05rem;margin-bottom:0.35rem">🚀 Deploy a Bounty Campaign</h2>
			<p class="text-secondary" style="font-size:0.85rem;margin-bottom:0.85rem">
				<a href="/auth/login" style="color:var(--verde)">Sign in</a> to fund escrow and post a bounty for scouts.
			</p>
			<a href="/auth/login" class="btn btn-primary">Sign in to deploy a bounty</a>
		</div>
	{/if}
</div>
