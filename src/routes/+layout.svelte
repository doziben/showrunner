<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { configStore } from '$lib/stores/config';
	import { avatarStore } from '$lib/stores/avatars';
	import { projectStore } from '$lib/stores/projects';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();

	let booted = $state(false);

	const PUBLIC_ROUTES = ['/onboarding'];

	function isPublic(pathname: string) {
		return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));
	}

	onMount(async () => {
		await Promise.all([configStore.load(), avatarStore.load(), projectStore.load()]);
		booted = true;
	});

	$effect(() => {
		if (!booted) return;
		const path = page.url.pathname;
		const config = $configStore.config;
		const ready = configStore.isComplete(config);

		if (!ready && !isPublic(path)) {
			goto('/onboarding', { replaceState: true });
			return;
		}

		if (ready && path === '/') {
			goto('/projects', { replaceState: true });
		}
	});

	const showShell = $derived(booted && !isPublic(page.url.pathname));
</script>

<Toaster theme="dark" position="bottom-right" />

{#if !booted}
	<div class="flex h-screen items-center justify-center bg-background">
		<div class="flex flex-col items-center gap-3 text-muted-foreground">
			<div
				class="h-5 w-5 animate-spin rounded-full border-2 border-foreground/15 border-t-foreground"
			></div>
		</div>
	</div>
{:else if showShell}
	<div class="flex h-screen overflow-hidden bg-background">
		<Sidebar />
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}
