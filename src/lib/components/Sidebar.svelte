<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import { projectStore } from '$lib/stores/projects';
	import { avatarStore } from '$lib/stores/avatars';
	import HIcon from '$lib/components/HIcon.svelte';

	const projectCount = $derived($projectStore.projects.length);
	const avatarCount = $derived($avatarStore.avatars.length);

	const navItems = $derived([
		{ href: '/avatars', label: 'Avatars', icon: 'user-group' as const, count: avatarCount },
		{ href: '/projects', label: 'Projects', icon: 'film-01' as const, count: projectCount },
		{ href: '/usage', label: 'Usage', icon: 'invoice-01' as const, count: 0 }
	]);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<aside
	class="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface text-foreground"
>
	<!-- Workspace pill -->
	<div class="px-3 pt-3">
		<button
			type="button"
			class="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted"
		>
			<span
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-workspace-badge text-[11px] font-semibold uppercase text-foreground"
			>
				<svg viewBox="0 0 24 24" fill="none" class="h-3.5 w-3.5">
					<path
						d="M5 4h11.5a2.5 2.5 0 0 1 0 5H8.5a2.5 2.5 0 0 0 0 5h7a2.5 2.5 0 0 1 0 5H4"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</span>
			<span class="flex min-w-0 flex-1 flex-col leading-tight">
				<span class="truncate text-[13px] font-medium">Showrunner</span>
				<span class="truncate text-[11px] text-muted-foreground">Local workspace</span>
			</span>
			<HIcon name="chevrons-down-up" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
		</button>
	</div>

	<!-- Top-level nav -->
	<nav class="mt-2 flex flex-col gap-0.5 px-3">
		{#each navItems as link (link.href)}
			{@const active = isActive(link.href)}
			<a
				href={link.href}
				class={cn(
					'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
					active
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
				)}
			>
				<HIcon name={link.icon} class="h-3.5 w-3.5" />
				<span class="flex-1">{link.label}</span>
				{#if link.count > 0}
					<span class="text-[11px] tabular-nums text-muted-foreground">{link.count}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Library section -->
	<div class="mt-6 px-3">
		<p class="px-2 pb-2 text-[11px] font-medium text-muted-foreground/80">Library</p>
		{#if avatarCount === 0 && projectCount === 0}
			<p class="px-2 py-1 text-[12px] text-muted-foreground/60">Nothing yet</p>
		{:else}
			<a
				href="/avatars"
				class={cn(
					'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
					page.url.pathname === '/avatars'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
				)}
			>
				<HIcon name="grid" class="h-3.5 w-3.5" />
				<span class="flex-1">All avatars</span>
				<span class="text-[11px] tabular-nums text-muted-foreground">{avatarCount}</span>
			</a>
			<a
				href="/projects"
				class={cn(
					'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
					page.url.pathname === '/projects'
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
				)}
			>
				<HIcon name="grid" class="h-3.5 w-3.5" />
				<span class="flex-1">All projects</span>
				<span class="text-[11px] tabular-nums text-muted-foreground">{projectCount}</span>
			</a>
		{/if}
	</div>

	<div class="flex-1"></div>

	<!-- Bottom utility row -->
	<div class="flex items-center justify-between border-t border-border/60 px-3 py-2.5">
		<a
			href="/projects"
			class="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
			title="Local projects"
		>
			<HIcon name="grid" class="h-3 w-3" />
			<span class="tabular-nums">{projectCount}</span>
		</a>
		<div class="flex items-center gap-0.5 text-muted-foreground">
			<a
				href="https://github.com/doziben/showrunner#troubleshooting"
				target="_blank"
				rel="noreferrer"
				aria-label="Help"
				class="rounded-md p-1.5 transition-colors hover:bg-muted hover:text-foreground"
			>
				<HIcon name="help-circle" class="h-3.5 w-3.5" />
			</a>
			<a
				href="/settings"
				aria-label="Settings"
				class={cn(
					'rounded-md p-1.5 transition-colors',
					isActive('/settings')
						? 'bg-muted text-foreground'
						: 'hover:bg-muted hover:text-foreground'
				)}
			>
				<HIcon name="settings-02" class="h-3.5 w-3.5" />
			</a>
		</div>
	</div>
</aside>
