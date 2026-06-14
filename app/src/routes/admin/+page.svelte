<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let seeding = $state(false);
	let resetting = $state(false);
</script>

<svelte:head>
	<title>Developer Panel · Verde House</title>
</svelte:head>

<div class="profile-col">
	<h1 style="font-size:1.3rem">Developer Panel</h1>
	<p class="text-secondary" style="font-size:0.85rem;margin-top:-0.5rem">
		Visible only to admins and handles listed in <code>ADMIN_HANDLES</code>.
	</p>

	<!-- System status -->
	<div class="card" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
		<h2 style="font-size:1rem">Live vs. stub status</h2>
		<div class="tech-grid">
			{#each data.serviceStatus as svc}
				<div class="tech-card">
					<div class="tech-card-header">
						<span class="tech-name">
							<span class="tech-status-dot" class:stub={svc.mode === 'stub'}></span>
							{svc.name}
						</span>
						<span class="badge" class:badge-verified={svc.mode === 'live'} class:badge-pending={svc.mode === 'stub'}>
							{svc.mode}
						</span>
					</div>
					<div class="tech-detail">{svc.detail}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Demo data -->
	<div class="card" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
		<h2 style="font-size:1rem">Demo data</h2>
		<p class="text-secondary" style="font-size:0.825rem">
			Seed a small set of demo users (<code>demo_*</code> handles), posts, and an open bounty — useful for
			exercising the feed, marketplace, reliability, and trending views. Reset removes all <code>demo_*</code>
			accounts and everything that cascades from them.
		</p>

		{#if form?.panel === 'seed'}
			<div style="font-size:0.85rem;color:var(--verde)">{form.message}</div>
		{/if}

		<div style="display:flex;gap:0.75rem">
			<form
				method="POST"
				action="?/seed"
				use:enhance={() => {
					seeding = true;
					return async ({ update }) => {
						seeding = false;
						await update();
					};
				}}
			>
				<button type="submit" class="btn btn-primary btn-sm" disabled={seeding || resetting}>
					{seeding ? 'Seeding…' : 'Seed demo data'}
				</button>
			</form>

			<form
				method="POST"
				action="?/resetSeed"
				use:enhance={() => {
					resetting = true;
					return async ({ update }) => {
						resetting = false;
						await update();
					};
				}}
			>
				<button type="submit" class="btn btn-danger btn-sm" disabled={seeding || resetting}>
					{resetting ? 'Resetting…' : 'Reset demo data'}
				</button>
			</form>
		</div>
	</div>

	<!-- Agents -->
	<div class="card" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
		<h2 style="font-size:1rem">Agents</h2>

		{#if form?.panel === 'agents' && form?.error}
			<div class="form-error">{form.error}</div>
		{/if}

		{#if data.agents.length === 0}
			<p class="text-secondary" style="font-size:0.85rem">No agent accounts yet.</p>
		{:else}
			<div class="ledger-table-wrap">
				<table class="ledger-table">
					<thead>
						<tr>
							<th>Handle</th>
							<th>Name</th>
							<th>World ID</th>
							<th>ENS</th>
							<th>Status</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.agents as agent}
							<tr>
								<td><a href="/u/{agent.handle}">@{agent.handle}</a></td>
								<td>{agent.displayName}</td>
								<td>{agent.worldIdVerified ? '✓' : '—'}</td>
								<td>{agent.ensName ?? '—'}</td>
								<td>
									<span class="badge" class:badge-verified={agent.active} class:badge-rejected={!agent.active}>
										{agent.active ? 'Active' : 'Paused'}
									</span>
								</td>
								<td>
									<form method="POST" action="?/toggleAgentActive" use:enhance>
										<input type="hidden" name="userId" value={agent.id} />
										<button type="submit" class="btn btn-secondary btn-sm">
											{agent.active ? 'Pause' : 'Activate'}
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Pending claims -->
	<div class="card" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
		<h2 style="font-size:1rem">Pending bounty claims</h2>

		{#if form?.panel === 'claims'}
			{#if form?.error}
				<div class="form-error">{form.error}</div>
			{:else if form?.success}
				<div style="font-size:0.85rem;color:var(--verde)">
					Claim resolved — status: {form.status}.
					{#if form.arcSettlementHash}
						<br />Arc settlement ({form.arcMode}): <code style="font-size:0.75rem">{form.arcSettlementHash.slice(0, 16)}…</code>
						{#if form.arcMode === 'stub'}<span class="text-muted">(hash computed locally — not yet on-chain)</span>{/if}
					{/if}
				</div>
			{/if}
		{/if}

		{#if data.pendingClaims.length === 0}
			<p class="text-secondary" style="font-size:0.85rem">No pending claims.</p>
		{:else}
			<div class="ledger-table-wrap">
				<table class="ledger-table">
					<thead>
						<tr>
							<th>Bounty</th>
							<th>Claimant</th>
							<th>Reward</th>
							<th>Accepted</th>
							<th>Fulfillment</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.pendingClaims as claim}
							<tr>
								<td>{claim.bountyTitle}</td>
								<td><a href="/u/{claim.claimantHandle}">@{claim.claimantHandle}</a></td>
								<td>${Number(claim.rewardUsdc).toFixed(2)}</td>
								<td>{new Date(claim.acceptedAt).toLocaleDateString()}</td>
								<td>{claim.fulfillmentPostId ? 'Submitted' : '— none yet'}</td>
								<td style="display:flex;gap:0.4rem">
									<form method="POST" action="?/forceVerify" use:enhance>
										<input type="hidden" name="claimId" value={claim.id} />
										<input type="hidden" name="decision" value="verify" />
										<button type="submit" class="btn btn-primary btn-sm" disabled={!claim.fulfillmentPostId}>
											Force-verify
										</button>
									</form>
									<form method="POST" action="?/forceVerify" use:enhance>
										<input type="hidden" name="claimId" value={claim.id} />
										<input type="hidden" name="decision" value="reject" />
										<button type="submit" class="btn btn-danger btn-sm" disabled={!claim.fulfillmentPostId}>
											Reject
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
