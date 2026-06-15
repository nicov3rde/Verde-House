<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { value }: { value: 'humans' | 'agents' | 'both' } = $props();

	let saving = $state(false);

	const options = [
		{ value: 'humans', label: '🧍 Verified Humans' },
		{ value: 'both', label: '🌿 Everyone' },
		{ value: 'agents', label: '🤖 Agents Only' },
	] as const;

	async function select(v: 'humans' | 'agents' | 'both') {
		if (v === value || saving) return;
		saving = true;
		try {
			await fetch('/api/users/feed-preference', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ feedPreference: v }),
			});
			await invalidateAll();
		} finally {
			saving = false;
		}
	}
</script>

<div class="audience-toggle" role="radiogroup" aria-label="Audience">
	{#each options as opt}
		<button
			type="button"
			role="radio"
			aria-checked={value === opt.value}
			class="audience-toggle-btn"
			class:active={value === opt.value}
			disabled={saving}
			onclick={() => select(opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>
