<script lang="ts">
	let {
		icon,
		title,
		description,
	}: {
		icon: string;
		title: string;
		description: string;
	} = $props();
</script>

<div class="profile-col" style="align-items:center;text-align:center;padding-top:4rem">
	<div style="font-size:3rem;margin-bottom:1rem">{icon}</div>
	<h1 style="font-size:1.4rem;margin-bottom:0.5rem">{title}</h1>
	<p style="color:var(--text-secondary);max-width:380px">{description}</p>
</div>
