<script lang="ts">
	import '$lib/register-hugeicons';
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { configStore } from '$lib/stores/config';
	import { avatarStore } from '$lib/stores/avatars';
	import { projectStore } from '$lib/stores/projects';
	import { transactionStore } from '$lib/stores/transactions';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopProgressBar from '$lib/components/TopProgressBar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import {
		ensureNotificationPermission,
		playFailurePing,
		playSuccessPing,
		showSystemNotification
	} from '$lib/helpers/notify';

	let { children } = $props();

	let booted = $state(false);

	const PUBLIC_ROUTES = ['/onboarding'];

	function isPublic(pathname: string) {
		return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));
	}

	onMount(async () => {
		await Promise.all([
			configStore.load(),
			avatarStore.load(),
			projectStore.load(),
			transactionStore.load()
		]);
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

	/* ──────────────────────────────────────────────────────────────────────
	 * Generation progress + completion notify.
	 * Watches the project store for transitions out of 'generating' and
	 * triggers the ping + system notification. Drives the top progress bar
	 * off any project currently in 'generating'.
	 * ────────────────────────────────────────────────────────────────────── */

	const anyGenerating = $derived(
		$projectStore.projects.some((p) => p.status === 'generating')
	);

	// Plain locals — these are bookkeeping for the effect below and must not
	// be reactive, otherwise reading + writing them in the same effect causes
	// effect_update_depth_exceeded.
	let lastStatuses: Record<string, string> = {};
	let initializedStatuses = false;

	$effect(() => {
		if (!booted) return;
		const projects = $projectStore.projects;

		// Snapshot statuses once after first load — anything in 'generating'
		// at boot might just be a stale flag, don't notify on initial load.
		if (!initializedStatuses) {
			const snapshot: Record<string, string> = {};
			for (const p of projects) snapshot[p.id] = p.status;
			lastStatuses = snapshot;
			initializedStatuses = true;
			return;
		}

		const next: Record<string, string> = { ...lastStatuses };
		for (const p of projects) {
			const prev = lastStatuses[p.id];
			next[p.id] = p.status;

			if (prev === 'generating') {
				if (p.status === 'complete') {
					playSuccessPing();
					showSystemNotification(
						'Showrunner — generation complete',
						`${p.name} finished. ${p.scenes.length} scene${p.scenes.length === 1 ? '' : 's'} ready.`
					);
				} else if (p.status === 'failed') {
					playFailurePing();
					showSystemNotification(
						'Showrunner — generation finished with errors',
						`${p.name} hit one or more failed scenes. Click Retry on any failed card.`
					);
				}
			} else if (prev !== 'generating' && p.status === 'generating') {
				// First time we see this project go to generating — request
				// notification permission lazily so the prompt rides on the user's
				// click, not on app boot.
				void ensureNotificationPermission();
			}
		}
		lastStatuses = next;
	});
</script>

<Toaster theme="dark" position="bottom-right" />
<TopProgressBar active={anyGenerating} />

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
