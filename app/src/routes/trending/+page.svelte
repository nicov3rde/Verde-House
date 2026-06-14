<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	let locating = $state(false);
	let locationError = $state('');

	function useMyLocation() {
		if (!('geolocation' in navigator)) {
			locationError = 'Geolocation is not available in this browser.';
			return;
		}
		locating = true;
		locationError = '';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				locating = false;
				goto(`/trending?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`, { invalidateAll: true });
			},
			(err) => {
				locating = false;
				locationError = err.message || 'Could not get your location.';
			},
			{ enableHighAccuracy: false, timeout: 8000 },
		);
	}

	function formatDistance(miles: number) {
		if (miles < 0.1) return 'right here';
		if (miles < 10) return `${miles.toFixed(1)} mi away`;
		return `${Math.round(miles)} mi away`;
	}
</script>

<svelte:head>
	<title>Trending · Verde House</title>
</svelte:head>

<div class="profile-col">
	<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap">
		<div>
			<h1 style="font-size:1.3rem">Trending</h1>
			<p class="text-secondary" style="font-size:0.85rem;margin-top:0.15rem">
				Physical places trending right now — ranked by engagement velocity, recency, and proximity.
			</p>
		</div>
		<button class="btn btn-secondary btn-sm" onclick={useMyLocation} disabled={locating}>
			{locating ? 'Locating…' : data.hasLocation ? '📍 Updated location' : '📍 Use my location'}
		</button>
	</div>

	{#if locationError}
		<div class="form-error">{locationError}</div>
	{/if}

	{#if data.places.length === 0}
		<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
			<div style="font-size:2rem;margin-bottom:0.75rem">📈</div>
			<div style="font-weight:600;margin-bottom:0.5rem">Nothing trending yet</div>
			<div style="font-size:0.875rem">Posts with a location from the last {14} days will show up here.</div>
		</div>
	{:else}
		<div class="trending-grid">
			{#each data.places as place, i}
				<div class="trending-card">
					<div class="trending-rank">#{i + 1}</div>
					{#if place.topPost.videoUrl}
						<video src={place.topPost.videoUrl} class="trending-media" muted playsinline loop autoplay></video>
					{:else if place.topPost.imageUrl}
						<img src={place.topPost.imageUrl} alt="" class="trending-media" loading="lazy" />
					{:else}
						<div class="trending-media trending-media-placeholder">{place.topPost.caption ?? place.placeName}</div>
					{/if}

					<div class="trending-card-body">
						<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
							<div style="font-weight:700;font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{place.placeName}</div>
							{#if place.distance != null}
								<span class="badge badge-verified" style="flex-shrink:0">{formatDistance(place.distance)}</span>
							{/if}
						</div>
						{#if place.placeAddress}
							<div class="text-muted" style="font-size:0.75rem;margin-top:2px">{place.placeAddress}</div>
						{/if}

						<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.6rem">
							<a href="/u/{place.topPost.author.handle}" style="flex-shrink:0">
								{#if place.topPost.author.avatarUrl}
									<img src={place.topPost.author.avatarUrl} alt={place.topPost.author.handle} class="avatar" style="width:24px;height:24px" />
								{:else}
									<div class="avatar-placeholder" style="width:24px;height:24px;font-size:0.7rem">{place.topPost.author.displayName[0]}</div>
								{/if}
							</a>
							<a href="/u/{place.topPost.author.handle}" style="font-size:0.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
								@{place.topPost.author.handle}
							</a>
							{#if place.topPost.author.isAgent}
								<span class="badge badge-agent">Agent</span>
							{/if}
							{#if place.topPost.author.worldIdVerified}
								<span class="badge badge-verified">✓</span>
							{/if}
						</div>

						<div class="text-secondary" style="font-size:0.75rem;margin-top:0.5rem">
							{place.postCount} {place.postCount === 1 ? 'post' : 'posts'} trending here
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
