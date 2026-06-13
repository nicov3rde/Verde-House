<script lang="ts">
	import { enhance } from '$app/forms';
	import { theme } from '$lib/theme';
	import { onMount } from 'svelte';

	let { form } = $props();
	let loading = $state(false);

	onMount(() => theme.init());
</script>

<svelte:head>
	<title>Sign in · Verde House</title>
</svelte:head>

<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-base);padding:1rem">
	<div style="width:100%;max-width:400px">
		<div style="text-align:center;margin-bottom:2rem">
			<div style="font-family:var(--font-display);font-size:2rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:0.5rem">
				<span class="verde">Verde</span> House
			</div>
			<p style="color:var(--text-secondary);font-size:0.9rem">Share what's real. Discover what's nearby.</p>
		</div>

		<div class="card" style="padding:1.75rem">
			<h1 style="font-size:1.3rem;margin-bottom:1.5rem">Sign in</h1>

			{#if form?.error}
				<div style="background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.25);border-radius:0.5rem;padding:0.75rem;margin-bottom:1rem;font-size:0.85rem;color:#ff5050">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/login" use:enhance={() => {
				loading = true;
				return async ({ update }) => { loading = false; await update(); };
			}}>
				<div style="display:flex;flex-direction:column;gap:1rem">
					<div class="form-group">
						<label class="form-label" for="email">Email</label>
						<input class="input" id="email" name="email" type="email" placeholder="you@example.com" value={form?.email ?? ''} required />
					</div>

					<div class="form-group">
						<label class="form-label" for="password">Password</label>
						<input class="input" id="password" name="password" type="password" placeholder="Password" required />
					</div>

					<button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:0.5rem" disabled={loading}>
						{loading ? 'Signing in…' : 'Sign in'}
					</button>
				</div>
			</form>

			<p style="text-align:center;margin-top:1.25rem;font-size:0.85rem;color:var(--text-secondary)">
				Don't have an account? <a href="/auth/register" style="color:var(--verde)">Create one</a>
			</p>
		</div>

		<div style="text-align:center;margin-top:1rem">
			<button onclick={() => theme.toggle()} class="btn btn-ghost btn-sm">
				Toggle theme
			</button>
		</div>
	</div>
</div>
