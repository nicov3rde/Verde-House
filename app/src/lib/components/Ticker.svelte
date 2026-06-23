<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	type Item = { symbol: string; price: number; change24h: number };
	let items = $state<Item[]>([]);
	let timer: ReturnType<typeof setInterval>;

	async function load() {
		try {
			const res = await fetch('/api/ticker');
			if (res.ok) items = await res.json();
		} catch {}
	}

	onMount(() => {
		load();
		timer = setInterval(load, 60_000);
	});

	onDestroy(() => clearInterval(timer));

	function fmt(n: number) {
		if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		if (n >= 1) return n.toFixed(2);
		return n.toFixed(4);
	}
</script>

{#if items.length > 0}
<div class="ticker-bar" aria-hidden="true">
	<div class="ticker-track">
		{#each { length: 2 } as _}
			{#each items as item}
				<span class="ticker-item">
					<span class="ticker-sym">{item.symbol}</span>
					<span class="ticker-price">${fmt(item.price)}</span>
					<span class="ticker-chg" class:up={item.change24h >= 0} class:dn={item.change24h < 0}>
						{item.change24h >= 0 ? '▲' : '▼'}{Math.abs(item.change24h).toFixed(2)}%
					</span>
				</span>
				<span class="ticker-dot">·</span>
			{/each}
		{/each}
	</div>
</div>
{/if}
