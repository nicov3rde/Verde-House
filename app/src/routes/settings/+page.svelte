<script lang="ts">
	import { enhance } from '$app/forms';
	import { theme } from '$lib/theme';

	let { data, form } = $props();

	let savingProfile = $state(false);
	let avatarUrl = $state(data.user.avatarUrl ?? '');
	let avatarUploading = $state(false);
	let avatarError = $state('');

	async function onAvatarSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		avatarUploading = true;
		avatarError = '';
		try {
			const body = new FormData();
			body.append('file', file);

			const res = await fetch('/api/media/upload', { method: 'POST', body });
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? 'Upload failed');
			}

			const result = await res.json();
			avatarUrl = result.url;
		} catch (err) {
			avatarError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			avatarUploading = false;
			input.value = '';
		}
	}
</script>

<svelte:head>
	<title>Settings · Verde House</title>
</svelte:head>

<div class="profile-col" style="max-width:560px">
	<h1 style="font-size:1.3rem">Settings</h1>

	<!-- Profile -->
	<div class="card" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
		<h2 style="font-size:1rem">Profile</h2>

		{#if form?.section === 'profile'}
			{#if form?.error}
				<div class="form-error">{form.error}</div>
			{:else if form?.success}
				<div style="font-size:0.825rem;color:var(--verde)">Profile updated.</div>
			{/if}
		{/if}

		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				savingProfile = true;
				return async ({ update }) => {
					savingProfile = false;
					await update();
				};
			}}
			style="display:flex;flex-direction:column;gap:1rem"
		>
			<div style="display:flex;gap:1rem;align-items:center">
				{#if avatarUrl}
					<img src={avatarUrl} alt={data.user.handle} class="avatar" style="width:56px;height:56px" />
				{:else}
					<div class="avatar-placeholder" style="width:56px;height:56px;font-size:1.3rem">{data.user.displayName[0]}</div>
				{/if}
				<div style="flex:1">
					<div style="font-weight:700">{data.user.displayName}</div>
					<div style="font-size:0.8rem;color:var(--text-muted)">@{data.user.handle}</div>
				</div>
				<label class="btn btn-secondary btn-sm" style="cursor:pointer">
					{avatarUploading ? 'Uploading…' : 'Change photo'}
					<input
						type="file"
						accept="image/*"
						onchange={onAvatarSelected}
						disabled={avatarUploading}
						style="display:none"
					/>
				</label>
			</div>

			{#if avatarError}
				<div class="form-error">{avatarError}</div>
			{/if}

			<input type="hidden" name="avatarUrl" value={avatarUrl} />

			<div class="form-group">
				<label class="form-label" for="displayName">Display name</label>
				<input class="input" id="displayName" name="displayName" type="text" value={data.user.displayName} required />
			</div>

			<div class="form-group">
				<label class="form-label" for="bio">Bio</label>
				<textarea class="input" id="bio" name="bio" rows="3" placeholder="Tell people what you're about">{data.user.bio ?? ''}</textarea>
			</div>

			<div>
				<button type="submit" class="btn btn-primary btn-sm" disabled={savingProfile}>
					{savingProfile ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</form>
	</div>

	<!-- Appearance -->
	<div class="card" style="padding:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem">
		<div>
			<h2 style="font-size:1rem">Appearance</h2>
			<p style="font-size:0.825rem;color:var(--text-secondary);margin-top:0.25rem">Switch between dark and light theme.</p>
		</div>
		<button onclick={() => theme.toggle()} class="btn btn-secondary btn-sm">
			{$theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
		</button>
	</div>

	<!-- Privacy -->
	<div class="card" style="padding:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem">
		<div>
			<h2 style="font-size:1rem">Privacy</h2>
			<p style="font-size:0.825rem;color:var(--text-secondary);margin-top:0.25rem">
				Shielded Balances (Unlink): hide your total bounty earnings from your profile's page data.
			</p>
		</div>
		<form method="POST" action="?/togglePrivacy" use:enhance>
			<button type="submit" class="btn btn-secondary btn-sm">
				{data.user.earningsPrivate ? 'Privacy: On' : 'Privacy: Off'}
			</button>
		</form>
	</div>

	<!-- Identity & Verification -->
	<div class="card" style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
		<h2 style="font-size:1rem">Identity & Verification</h2>

		<!-- World ID -->
		<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
			<div>
				<div style="font-weight:600;font-size:0.9rem">World ID</div>
				<p style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.15rem">
					Proof-of-personhood — verified scouts get a badge on their profile and count toward the network's
					verified-human stats.
				</p>
			</div>
			{#if data.worldId.verified}
				<span class="badge badge-verified">✅ Verified</span>
			{:else if data.worldId.mode === 'live'}
				<button class="btn btn-secondary btn-sm" disabled>Verify with World ID</button>
			{:else}
				<span class="badge" title="World ID isn't configured yet for this deployment">Not verified</span>
			{/if}
		</div>

		<div class="divider"></div>

		<!-- ENS -->
		<div>
			<div style="font-weight:600;font-size:0.9rem">ENS</div>
			<p style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.15rem">
				Link your ENS name to carry your reliability and category-expertise scores across apps{#if data.ens.mode === 'stub'}
					&nbsp;(on-chain mirroring activates once this deployment has an ETH RPC endpoint configured){/if}.
			</p>
		</div>

		{#if form?.section === 'ens'}
			{#if form?.error}
				<div class="form-error">{form.error}</div>
			{:else if form?.success}
				<div style="font-size:0.825rem;color:var(--verde)">ENS updated.</div>
			{/if}
		{/if}

		{#if data.ens.name}
			<div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
				<span class="badge badge-verified">{data.ens.name}</span>
				<form method="POST" action="?/disconnectEns" use:enhance>
					<button type="submit" class="btn btn-secondary btn-sm">Disconnect</button>
				</form>
			</div>
		{:else}
			<form method="POST" action="?/connectEns" use:enhance style="display:flex;gap:0.5rem">
				<input class="input" name="ensName" type="text" placeholder="yourname.eth" style="flex:1" />
				<button type="submit" class="btn btn-secondary btn-sm">Connect</button>
			</form>
		{/if}
	</div>

	<!-- Account -->
	<div class="card" style="padding:1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem">
		<div>
			<h2 style="font-size:1rem">Account</h2>
			<p style="font-size:0.825rem;color:var(--text-secondary);margin-top:0.25rem">{data.user.email}</p>
		</div>
		<form method="POST" action="/auth/logout">
			<button type="submit" class="btn btn-danger btn-sm">Log out</button>
		</form>
	</div>
</div>
