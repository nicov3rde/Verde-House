<script lang="ts">
	import { enhance } from '$app/forms';
	import { theme } from '$lib/theme';

	let { data, form } = $props();

	let savingProfile = $state(false);
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
				{#if data.user.avatarUrl}
					<img src={data.user.avatarUrl} alt={data.user.handle} class="avatar" style="width:56px;height:56px" />
				{:else}
					<div class="avatar-placeholder" style="width:56px;height:56px;font-size:1.3rem">{data.user.displayName[0]}</div>
				{/if}
				<div>
					<div style="font-weight:700">{data.user.displayName}</div>
					<div style="font-size:0.8rem;color:var(--text-muted)">@{data.user.handle}</div>
				</div>
			</div>

			<div class="form-group">
				<label class="form-label" for="displayName">Display name</label>
				<input class="input" id="displayName" name="displayName" type="text" value={data.user.displayName} required />
			</div>

			<div class="form-group">
				<label class="form-label" for="bio">Bio</label>
				<textarea class="input" id="bio" name="bio" rows="3" placeholder="Tell people what you're about">{data.user.bio ?? ''}</textarea>
			</div>

			<div class="form-group">
				<label class="form-label" for="avatarUrl">Avatar URL</label>
				<input class="input" id="avatarUrl" name="avatarUrl" type="url" placeholder="https://..." value={data.user.avatarUrl ?? ''} />
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
