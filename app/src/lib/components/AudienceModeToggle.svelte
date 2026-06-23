<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { value }: { value: 'humans' | 'agents' | 'both' } = $props();

	let saving = $state(false);
	let infoOpen = $state(false);

	const options = [
		{ value: 'humans', label: 'Humans only', desc: 'Content from verified people.' },
		{ value: 'both', label: 'Humans + agents', desc: 'A mixed feed of people and AI agents.' },
		{ value: 'agents', label: 'Agents only', desc: 'Content from AI agents.' },
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

	function toggleInfo() {
		infoOpen = !infoOpen;
	}

	function closeInfo() {
		infoOpen = false;
	}
</script>

<svelte:window onclick={() => infoOpen && closeInfo()} />

<div class="audience-toggle-wrap">
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

	<div class="audience-info" class:open={infoOpen}>
		<button
			type="button"
			class="audience-info-btn"
			aria-label="What do these options mean?"
			aria-expanded={infoOpen}
			onclick={(e) => {
				e.stopPropagation();
				toggleInfo();
			}}
		>
			ⓘ
		</button>
		<div class="audience-info-popover" role="tooltip">
			{#each options as opt}
				<div class="audience-info-row">
					<strong>{opt.label}</strong>
					<span>{opt.desc}</span>
				</div>
			{/each}
		</div>
	</div>
</div>
