<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { theme } from '$lib/theme';
	import AudienceModeToggle from '$lib/components/AudienceModeToggle.svelte';

	let { children, data } = $props();

	onMount(() => {
		theme.init();
	});

	const navItems = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/explore', label: 'Explore', icon: 'explore' },
		{ href: '/messages', label: 'Messages', icon: 'messages' },
		{ href: '/marketplace', label: 'Marketplace', icon: 'marketplace' },
		{ href: '/notifications', label: 'Notifications', icon: 'bell' },
		{ href: '/settings', label: 'Settings', icon: 'settings' },
	];

	function isActive(href: string) {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}

	function profileHref() {
		if (data?.user?.handle) return `/u/${data.user.handle}`;
		return '/auth/login';
	}
</script>

{#snippet homeIcon()}
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
{/snippet}

{#snippet exploreIcon()}
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
{/snippet}

{#snippet messagesIcon()}
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
{/snippet}

{#snippet marketplaceIcon()}
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
{/snippet}

{#snippet bellIcon()}
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
{/snippet}

{#snippet profileIcon()}
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
{/snippet}

{#snippet settingsIcon()}
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
{/snippet}

{#snippet iconFor(name: string)}
	{#if name === 'home'}{@render homeIcon()}
	{:else if name === 'explore'}{@render exploreIcon()}
	{:else if name === 'messages'}{@render messagesIcon()}
	{:else if name === 'marketplace'}{@render marketplaceIcon()}
	{:else if name === 'bell'}{@render bellIcon()}
	{:else if name === 'profile'}{@render profileIcon()}
	{:else if name === 'settings'}{@render settingsIcon()}
	{/if}
{/snippet}

{#if data?.user}
<!-- Authenticated app shell -->
<div class="app-layout">
	<!-- Desktop left sidebar -->
	<aside class="sidebar">
		<a href="/" class="sidebar-logo">
			<span class="verde">Verde</span> House
		</a>

		<nav class="sidebar-nav">
			<!-- Profile link at top of nav -->
			<a href={profileHref()} class="nav-item" class:active={$page.url.pathname.startsWith('/u/')}>
				{@render profileIcon()}
				Profile
			</a>
			{#each navItems as item}
				<a href={item.href} class="nav-item" class:active={isActive(item.href)}>
					{@render iconFor(item.icon)}
					{item.label}
					{#if (item.icon === 'bell' && data.unreadNotifications) || (item.icon === 'messages' && data.unreadMessages)}
						<span class="notif-dot"></span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="sidebar-user">
			{#if data.user.avatarUrl}
				<img src={data.user.avatarUrl} alt={data.user.handle} class="avatar" style="width:32px;height:32px"/>
			{:else}
				<div class="avatar-placeholder" style="width:32px;height:32px;font-size:0.85rem">{data.user.displayName[0]}</div>
			{/if}
			<div style="flex:1;min-width:0">
				<div class="sidebar-user-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{data.user.displayName}</div>
				<div class="sidebar-user-handle">@{data.user.handle}</div>
			</div>
			<button
				onclick={() => theme.toggle()}
				class="btn btn-icon btn-ghost"
				title="Toggle theme"
				style="padding:0.35rem"
			>
				{#if $theme === 'dark'}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
				{/if}
			</button>
		</div>
	</aside>

	<main class="main-content">
		<div class="topbar">
			<AudienceModeToggle value={data.user.feedPreference} />
		</div>
		{@render children()}
	</main>

	<!-- Mobile bottom nav -->
	<nav class="bottom-nav">
		{#each [navItems[0], navItems[1], navItems[2], navItems[3], navItems[4]] as item}
			<a href={item.href} class="bottom-nav-item" class:active={isActive(item.href)} style="position:relative">
				<div style="width:22px;height:22px">{@render iconFor(item.icon)}</div>
				{item.label}
				{#if (item.icon === 'bell' && data.unreadNotifications) || (item.icon === 'messages' && data.unreadMessages)}
					<span class="notif-dot" style="position:absolute;top:4px;right:calc(50% - 16px)"></span>
				{/if}
			</a>
		{/each}
	</nav>
</div>

{:else}
<!-- Unauthenticated: render without shell -->
{@render children()}
{/if}
