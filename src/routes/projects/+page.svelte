<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { projectStore } from '$lib/stores/projects';
	import { avatarStore } from '$lib/stores/avatars';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Clapperboard from '@lucide/svelte/icons/clapperboard';
	import type { Avatar, Project } from '$lib/types';

	let search = $state('');

	const projects = $derived(
		$projectStore.projects.filter((p) =>
			search.trim() ? p.name.toLowerCase().includes(search.trim().toLowerCase()) : true
		)
	);
	const avatars = $derived($avatarStore.avatars);

	function avatarFor(id: string): Avatar | undefined {
		return avatars.find((a) => a.id === id);
	}

	function statusLabel(status: Project['status']) {
		switch (status) {
			case 'complete':
				return { text: 'Complete', dot: 'bg-emerald-500' };
			case 'generating':
				return { text: 'Generating', dot: 'bg-foreground' };
			case 'failed':
				return { text: 'Failed', dot: 'bg-destructive' };
			default:
				return { text: 'Draft', dot: 'bg-muted-foreground/60' };
		}
	}

	function formatRelative(ts: number): string {
		const diff = Date.now() - ts;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `Edited ${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `Edited ${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 30) return `Edited ${days}d ago`;
		return `Edited ${new Date(ts).toLocaleDateString()}`;
	}
</script>

<div class="flex h-full flex-col">
	<PageHeader title="All" searchPlaceholder="Search projects" bind:search>
		{#snippet actions()}
			<Button href="/projects/new" size="sm" class="h-8">
				<Plus class="h-3.5 w-3.5" />
				New project
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex-1 overflow-y-auto px-6 py-8">
		{#if avatars.length === 0}
			<div class="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground"
				>
					<Clapperboard class="h-4 w-4" />
				</div>
				<div class="space-y-1.5">
					<p class="text-[15px] font-medium text-foreground">Build an avatar first</p>
					<p class="text-[13px] text-muted-foreground">
						A project needs an avatar to star in the avatar scenes. Build one, then come back here.
					</p>
				</div>
				<Button href="/avatars/new" size="sm" class="mt-2 h-8">Create avatar</Button>
			</div>
		{:else if $projectStore.projects.length === 0}
			<div class="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground"
				>
					<Clapperboard class="h-4 w-4" />
				</div>
				<div class="space-y-1.5">
					<p class="text-[15px] font-medium text-foreground">No projects</p>
					<p class="text-[13px] text-muted-foreground">
						Paste a script, pick an avatar, and Showrunner breaks it into shot-by-shot scenes.
					</p>
				</div>
				<Button href="/projects/new" size="sm" class="mt-2 h-8">
					<Plus class="h-3.5 w-3.5" />
					New project
				</Button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<a href="/projects/new" class="group flex flex-col gap-2">
					<div
						class="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
					>
						<Plus class="h-5 w-5" />
					</div>
					<div class="flex flex-col gap-0.5 px-1">
						<h3 class="truncate text-[13px] font-medium text-foreground">New project</h3>
						<p class="truncate text-[12px] text-muted-foreground">Paste a script</p>
					</div>
				</a>
				{#each projects as project (project.id)}
					{@const avatar = avatarFor(project.avatarId)}
					{@const status = statusLabel(project.status)}
					<a
						href={`/projects/${project.id}/storyboard`}
						class="group flex flex-col gap-2 transition-opacity hover:opacity-95"
					>
						<div
							class="aspect-[4/3] w-full overflow-hidden rounded-xl bg-card ring-1 ring-border transition-all group-hover:ring-border-strong"
						>
							{#if avatar?.referenceImageBase64}
								<img
									src={avatar.referenceImageBase64}
									alt={avatar.name}
									class="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.015]"
								/>
							{:else}
								<div class="flex h-full w-full items-center justify-center text-muted-foreground/40">
									<Clapperboard class="h-8 w-8" />
								</div>
							{/if}
						</div>
						<div class="flex flex-col gap-0.5 px-1">
							<div class="flex items-center gap-2">
								<h3 class="truncate text-[13px] font-medium text-foreground">{project.name}</h3>
								<span class={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} title={status.text}></span>
							</div>
							<p class="truncate text-[12px] text-muted-foreground">
								{formatRelative(project.updatedAt)} · {project.scenes.length} scene{project.scenes.length === 1 ? '' : 's'}
							</p>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
