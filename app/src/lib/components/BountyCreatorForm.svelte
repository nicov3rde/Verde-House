<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';

	let {
		currentUser,
		paymentsMode,
		stripePublishableKey,
	}: {
		currentUser: { id: string; businessName: string | null; displayName: string };
		paymentsMode: 'live' | 'stub';
		stripePublishableKey: string | null;
	} = $props();

	let title = $state('');
	let brand = $state(currentUser.businessName ?? currentUser.displayName);
	let rewardUsdc = $state(5);
	let maxClaims = $state(10);
	let placeName = $state('');
	let radiusMiles = $state(2);
	let description = $state('');

	let submitting = $state(false);
	let error = $state('');
	let success = $state('');

	let clientSecret = $state<string | null>(null);
	let confirmingPayment = $state(false);
	let elementContainer: HTMLDivElement | undefined = $state();
	let stripeInstance: Stripe | null = null;
	let stripeElements: StripeElements | null = null;

	const totalEscrow = $derived(Math.max(0, rewardUsdc * maxClaims));

	function resetForm() {
		title = '';
		rewardUsdc = 5;
		maxClaims = 10;
		placeName = '';
		radiusMiles = 2;
		description = '';
	}

	async function submit(e: Event) {
		e.preventDefault();
		error = '';
		success = '';

		if (!title.trim() || !description.trim()) {
			error = 'Title and verification criteria are required.';
			return;
		}
		if (!(rewardUsdc > 0) || !(maxClaims >= 1)) {
			error = 'Payout per claim must be > 0 and claim cap must be at least 1.';
			return;
		}

		submitting = true;
		try {
			const res = await fetch('/api/bounties', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					brand: brand.trim(),
					rewardUsdc,
					maxClaims,
					placeName: placeName.trim(),
					radiusMiles,
					description: description.trim(),
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message ?? 'Failed to create bounty');
			}

			const data = await res.json();

			if (data.mode === 'live' && data.clientSecret) {
				clientSecret = data.clientSecret;
				await mountPaymentElement(data.clientSecret);
			} else {
				success = `Bounty deployed — $${totalEscrow.toFixed(2)} USDC escrowed (simulated).`;
				resetForm();
				await invalidateAll();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			submitting = false;
		}
	}

	async function mountPaymentElement(secret: string) {
		if (!stripePublishableKey) {
			error = 'Stripe publishable key is not configured.';
			return;
		}
		stripeInstance = await loadStripe(stripePublishableKey);
		if (!stripeInstance || !elementContainer) return;
		stripeElements = stripeInstance.elements({ clientSecret: secret });
		stripeElements.create('payment').mount(elementContainer);
	}

	async function confirmPayment() {
		if (!stripeInstance || !stripeElements) return;
		confirmingPayment = true;
		error = '';
		const { error: confirmError } = await stripeInstance.confirmPayment({
			elements: stripeElements,
			redirect: 'if_required',
		});
		confirmingPayment = false;

		if (confirmError) {
			error = confirmError.message ?? 'Payment failed';
			return;
		}

		success = 'Payment confirmed — the bounty will go live once Stripe finishes processing.';
		clientSecret = null;
		stripeElements = null;
		resetForm();
		await invalidateAll();
	}
</script>

<div class="card" style="padding:1.25rem">
	<h2 style="font-size:1.05rem;margin-bottom:0.25rem">🚀 Deploy a Bounty Campaign</h2>
	<p class="text-secondary" style="font-size:0.8rem;margin-bottom:1rem">
		{#if paymentsMode === 'stub'}
			Stripe test keys aren't configured, so escrow is simulated instantly — the bounty goes
			straight to the ledger as "Open".
		{:else}
			Test mode — funds the escrow via a Stripe PaymentIntent.
		{/if}
	</p>

	{#if !clientSecret}
		<form onsubmit={submit} style="display:flex;flex-direction:column;gap:0.85rem">
			<div class="form-group">
				<label class="form-label" for="b-title">Bounty Action Title</label>
				<input
					id="b-title"
					class="input"
					type="text"
					placeholder="e.g. Try our new cold brew & post about it"
					bind:value={title}
					disabled={submitting}
				/>
			</div>

			<div class="form-group">
				<label class="form-label" for="b-brand">Brand / Business</label>
				<input id="b-brand" class="input" type="text" bind:value={brand} disabled={submitting} />
			</div>

			<div style="display:flex;gap:1rem;flex-wrap:wrap">
				<div class="form-group" style="flex:1;min-width:140px">
					<label class="form-label" for="b-reward">Payout per Claim (USDC)</label>
					<input
						id="b-reward"
						class="input"
						type="number"
						min="0.01"
						step="0.01"
						bind:value={rewardUsdc}
						disabled={submitting}
					/>
				</div>
				<div class="form-group" style="flex:1;min-width:140px">
					<label class="form-label" for="b-cap">Claim Cap (max claims)</label>
					<input
						id="b-cap"
						class="input"
						type="number"
						min="1"
						step="1"
						bind:value={maxClaims}
						disabled={submitting}
					/>
				</div>
			</div>

			<div style="display:flex;gap:1rem;flex-wrap:wrap">
				<div class="form-group" style="flex:2;min-width:160px">
					<label class="form-label" for="b-place">Geo-Fence Location</label>
					<input
						id="b-place"
						class="input"
						type="text"
						placeholder="e.g. Verde Coffee, Mission District"
						bind:value={placeName}
						disabled={submitting}
					/>
				</div>
				<div class="form-group" style="flex:1;min-width:120px">
					<label class="form-label" for="b-radius">Radius (miles)</label>
					<input
						id="b-radius"
						class="input"
						type="number"
						min="0.1"
						step="0.1"
						bind:value={radiusMiles}
						disabled={submitting}
					/>
				</div>
			</div>

			<div class="form-group">
				<label class="form-label" for="b-desc">Verification Criteria Description</label>
				<textarea
					id="b-desc"
					class="input"
					rows="3"
					placeholder="What does a claimant need to do or show to get paid?"
					bind:value={description}
					disabled={submitting}
				></textarea>
			</div>

			{#if error}
				<div class="form-error">{error}</div>
			{/if}
			{#if success}
				<div style="font-size:0.8rem;color:var(--verde)">{success}</div>
			{/if}

			<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
				<div style="font-size:0.8rem;color:var(--text-secondary)">
					Total escrow: <strong style="color:var(--text-primary)">${totalEscrow.toFixed(2)} USDC</strong>
					({maxClaims} × ${rewardUsdc.toFixed(2)})
				</div>
				<button type="submit" class="btn btn-escrow btn-lg" disabled={submitting}>
					{#if submitting}<span class="spinner"></span> Deploying…{:else}Deploy Bounty & Escrow Funds{/if}
				</button>
			</div>
		</form>
	{:else}
		<div style="display:flex;flex-direction:column;gap:0.85rem">
			<div bind:this={elementContainer}></div>
			{#if error}
				<div class="form-error">{error}</div>
			{/if}
			<button class="btn btn-escrow btn-lg" onclick={confirmPayment} disabled={confirmingPayment}>
				{#if confirmingPayment}<span class="spinner"></span> Confirming…{:else}Pay ${totalEscrow.toFixed(2)} & Escrow{/if}
			</button>
		</div>
	{/if}
</div>
