<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import CreatePost from '$lib/components/CreatePost.svelte';

	let { data } = $props();

	let accepting = $state(false);
	let acceptError = $state('');
	let reviewingId = $state<string | null>(null);
	let reviewError = $state('');

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

	const claimStatusBadgeClass: Record<string, string> = {
		pending: 'badge-pending',
		verified: 'badge-verified',
		paid: 'badge-paid',
		rejected: 'badge-rejected',
	};

	function agentVerdictLabel(verified: boolean | null | undefined) {
		if (verified === true) return '✅ Agent check: looks good';
		if (verified === false) return '⚠️ Agent check: flagged for review';
		return '❔ Agent check: inconclusive';
	}

	const isFull = $derived(data.bounty.claimCount >= data.bounty.maxClaims);
	const canAccept = $derived(data.bounty.status === 'open' && data.bounty.active && !isFull && !data.myClaim);

	function fmtUsdc(n: number) {
		return `$${n.toFixed(2)}`;
	}

	async function accept() {
		accepting = true;
		acceptError = '';
		try {
			const res = await fetch(`/api/bounties/${data.bounty.id}/claim`, { method: 'POST' });
			if (!res.ok) {
				const d = await res.json().catch(() => ({}));
				throw new Error(d.message ?? 'Failed to accept bounty');
			}
			await invalidateAll();
		} catch (e) {
			acceptError = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			accepting = false;
		}
	}

	async function review(claimId: string, action: 'verify' | 'reject') {
		reviewingId = claimId;
		reviewError = '';
		try {
			const res = await fetch(`/api/bounties/${data.bounty.id}/claims/${claimId}/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action }),
			});
			if (!res.ok) {
				const d = await res.json().catch(() => ({}));
				throw new Error(d.message ?? 'Failed to review claim');
			}
			await invalidateAll();
		} catch (e) {
			reviewError = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			reviewingId = null;
		}
	}
</script>

<svelte:head>
	<title>{data.bounty.title} · Marketplace · Verde House</title>
</svelte:head>

<div class="profile-col">
	<a href="/marketplace" class="btn btn-secondary btn-sm" style="align-self:flex-start">← Marketplace</a>

	<div class="card" style="padding:1.25rem">
		<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
			<div>
				<h1 style="font-size:1.3rem">{data.bounty.title}</h1>
				<div class="text-secondary" style="font-size:0.85rem;margin-top:0.25rem">{data.bounty.brand}</div>
			</div>
			<span class="badge {statusBadgeClass[data.bounty.status] ?? ''}">
				{statusLabel[data.bounty.status] ?? data.bounty.status}
			</span>
		</div>

		<div class="divider"></div>

		<p style="font-size:0.9rem;line-height:1.6">{data.bounty.description}</p>

		<div class="stat-grid" style="margin-top:1rem">
			<div class="stat-card">
				<div class="stat-label">Payout per Claim</div>
				<div class="stat-value">{fmtUsdc(data.bounty.rewardUsdc)}</div>
				<div class="stat-sub">USDC</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Geo-Fence</div>
				<div class="stat-value" style="font-size:1.1rem">{data.bounty.placeName ?? '—'}</div>
				<div class="stat-sub">{data.bounty.radiusMiles}mi radius</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Claims</div>
				<div class="stat-value">{data.bounty.claimCount} / {data.bounty.maxClaims}</div>
			</div>
		</div>
	</div>

	{#if data.myClaim}
		{#if data.myClaim.fulfillmentPostId}
			<div class="card" style="padding:1.25rem">
				<h2 style="font-size:1rem;margin-bottom:0.5rem">Your submission</h2>
				<span class="badge {claimStatusBadgeClass[data.myClaim.status] ?? ''}">{data.myClaim.status}</span>
				{#if data.myClaim.status === 'paid'}
					<p style="font-size:0.85rem;margin-top:0.5rem;color:var(--verde)">
						You were paid {fmtUsdc(data.bounty.rewardUsdc)} USDC.
					</p>
				{:else if data.myClaim.status === 'rejected'}
					<p style="font-size:0.85rem;margin-top:0.5rem;color:#ff5050">This submission was not approved.</p>
				{:else}
					<p class="text-secondary" style="font-size:0.85rem;margin-top:0.5rem">Awaiting review.</p>
				{/if}
			</div>
		{:else}
			<div class="card" style="padding:1.25rem">
				<h2 style="font-size:1rem;margin-bottom:0.75rem">Fulfill this bounty</h2>
				<CreatePost
					user={data.user}
					bountyClaim={{ id: data.myClaim.id, bountyTitle: data.bounty.title, placeName: data.bounty.placeName }}
				/>
			</div>
		{/if}
	{:else if canAccept}
		<div class="card" style="padding:1.25rem;text-align:center">
			{#if acceptError}
				<div class="form-error" style="margin-bottom:0.75rem">{acceptError}</div>
			{/if}
			<button class="btn btn-escrow btn-lg" onclick={accept} disabled={accepting}>
				{#if accepting}<span class="spinner"></span> Accepting…{:else}Accept Bounty{/if}
			</button>
		</div>
	{:else if isFull}
		<div class="card" style="padding:1.25rem;text-align:center;color:var(--text-muted)">
			This bounty has reached its claim cap.
		</div>
	{:else if data.bounty.status !== 'open'}
		<div class="card" style="padding:1.25rem;text-align:center;color:var(--text-muted)">
			This bounty isn't open for claims yet.
		</div>
	{/if}

	<div class="card" style="padding:1.25rem">
		<h2 style="font-size:1rem;margin-bottom:0.75rem">Submissions ({data.claims.length})</h2>
		{#if reviewError}
			<div class="form-error" style="margin-bottom:0.75rem">{reviewError}</div>
		{/if}
		{#if data.claims.length === 0}
			<div class="text-muted" style="font-size:0.85rem">No one has accepted this bounty yet.</div>
		{:else}
			<div style="display:flex;flex-direction:column;gap:0.75rem">
				{#each data.claims as claim (claim.id)}
					<div class="card-elevated" style="padding:0.75rem;display:flex;flex-direction:column;gap:0.6rem">
						<div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
							<div style="display:flex;align-items:center;gap:0.6rem">
								{#if claim.user.avatarUrl}
									<img src={claim.user.avatarUrl} alt={claim.user.handle} class="avatar" style="width:32px;height:32px" />
								{:else}
									<div class="avatar-placeholder" style="width:32px;height:32px;font-size:0.8rem">{claim.user.displayName[0]}</div>
								{/if}
								<div>
									<div style="font-size:0.85rem;font-weight:600">{claim.user.displayName}</div>
									<div class="text-muted" style="font-size:0.75rem">@{claim.user.handle}</div>
								</div>
							</div>

							<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
								<span class="badge {claimStatusBadgeClass[claim.status] ?? ''}">{claim.status}</span>
								{#if claim.post}
									<a href={`/u/${claim.user.handle}`} class="btn btn-secondary btn-sm">View post</a>
								{/if}
								{#if data.isCreator && claim.status === 'pending' && claim.fulfillmentPostId}
									<button
										class="btn btn-primary btn-sm"
										onclick={() => review(claim.id, 'verify')}
										disabled={reviewingId === claim.id}
									>
										{reviewingId === claim.id ? '…' : 'Verify & Pay'}
									</button>
									<button
										class="btn btn-danger btn-sm"
										onclick={() => review(claim.id, 'reject')}
										disabled={reviewingId === claim.id}
									>
										Reject
									</button>
								{/if}
							</div>
						</div>

						{#if data.isCreator && claim.agentCheck}
							<div class="agent-check">
								<div style="font-size:0.8rem;font-weight:600">{agentVerdictLabel(claim.agentCheck.verified)}</div>
								<ul style="margin:0.35rem 0 0;padding-left:1.1rem;font-size:0.75rem;color:var(--text-muted);display:flex;flex-direction:column;gap:0.15rem">
									<li>Geo/time match: {claim.agentCheck.checks.geoTimeMatch.detail}</li>
									<li>Originality: {claim.agentCheck.checks.originality.detail}</li>
									<li>External engagement (stubbed): {claim.agentCheck.checks.externalEngagement.detail}</li>
								</ul>
							</div>
						{:else if claim.agentNotes}
							<div class="agent-check">
								<div style="font-size:0.8rem;font-weight:600">{agentVerdictLabel(claim.agentVerified)}</div>
								<p style="margin:0.35rem 0 0;font-size:0.75rem;color:var(--text-muted)">{claim.agentNotes}</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
