<script lang="ts">
	import CreatePost from './CreatePost.svelte';

	let {
		open = $bindable(false),
		user,
	}: {
		open: boolean;
		user: { id: string; handle: string; displayName: string; avatarUrl?: string | null };
	} = $props();

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

{#if open}
	<div class="composer-overlay" onclick={close} onkeydown={onKeydown} role="presentation">
		<div
			class="composer-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Create post"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="composer-modal-header">
				<h2>Create post</h2>
				<button type="button" class="composer-modal-close" aria-label="Close" onclick={close}>✕</button>
			</div>
			<CreatePost {user} onSuccess={close} />
		</div>
	</div>
{/if}

<svelte:window onkeydown={onKeydown} />
