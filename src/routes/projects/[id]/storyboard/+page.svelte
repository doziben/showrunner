<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { projectStore } from '$lib/stores/projects';
	import { avatarStore } from '$lib/stores/avatars';
	import { configStore } from '$lib/stores/config';
	import { jobStore } from '$lib/stores/jobs';
	import { transactionStore } from '$lib/stores/transactions';
	import SceneCard from '$lib/components/SceneCard.svelte';
	import LipsyncModelPicker from '$lib/components/LipsyncModelPicker.svelte';
	import { estimateCost, fmtUsd } from '$lib/helpers/cost';
	import { formatDuration } from '$lib/helpers/duration';
	import { runProjectPipeline, retryScene } from '$lib/pipeline/orchestrator';
	import { DEFAULT_LIPSYNC_PROVIDER, getLipsyncModel } from '$lib/pipeline/lipsync-models';
	import type { LipsyncProvider, Scene } from '$lib/types';
	import { nanoid } from 'nanoid';
	import { toast } from 'svelte-sonner';
	import HIcon from '$lib/components/HIcon.svelte';

	const id = $derived(page.params.id);
	const project = $derived($projectStore.projects.find((p) => p.id === id));
	const avatar = $derived(
		project ? $avatarStore.avatars.find((a) => a.id === project.avatarId) : undefined
	);
	const config = $derived($configStore.config);
	const scenes = $derived(project?.scenes ?? []);
	const lipsyncProvider = $derived<LipsyncProvider>(
		project?.lipsyncProvider ?? DEFAULT_LIPSYNC_PROVIDER
	);
	const lipsyncModel = $derived(getLipsyncModel(lipsyncProvider));
	const cost = $derived(estimateCost(scenes, lipsyncProvider));
	const spent = $derived(
		project
			? $transactionStore.transactions
					.filter((t) => t.projectId === project.id && t.status === 'success')
					.reduce((sum, t) => sum + t.costUsd, 0)
			: 0
	);

	async function changeLipsyncProvider(next: LipsyncProvider) {
		if (!project || project.lipsyncProvider === next) return;
		await projectStore.patch(project.id, { lipsyncProvider: next });
	}

	let dragIndex = $state<number | null>(null);
	let confirmingDelete = $state(false);

	const allComplete = $derived(scenes.length > 0 && scenes.every((s) => s.status === 'complete'));
	const isGenerating = $derived(project?.status === 'generating');

	async function patchScene(sceneId: string, partial: Partial<Scene>) {
		if (!project) return;
		await projectStore.patchScene(project.id, sceneId, partial);
	}

	async function removeScene(sceneId: string) {
		if (!project) return;
		const next = project.scenes
			.filter((s) => s.id !== sceneId)
			.map((s, i) => ({ ...s, order: i }));
		await projectStore.setScenes(project.id, next);
	}

	async function addScene() {
		if (!project) return;
		const newScene: Scene = {
			id: nanoid(),
			order: project.scenes.length,
			type: 'avatar',
			audioLine: '',
			durationSeconds: 4,
			actionDescription: '',
			framing: 'medium',
			status: 'pending'
		};
		await projectStore.setScenes(project.id, [...project.scenes, newScene]);
	}

	function onDragStart(i: number) {
		return (e: DragEvent) => {
			dragIndex = i;
			e.dataTransfer?.setData('text/plain', String(i));
			if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
		};
	}
	function onDragOver(_i: number) {
		return (e: DragEvent) => {
			e.preventDefault();
		};
	}
	function onDrop(i: number) {
		return async (e: DragEvent) => {
			e.preventDefault();
			if (dragIndex === null || dragIndex === i || !project) {
				dragIndex = null;
				return;
			}
			const next = [...project.scenes];
			const [moved] = next.splice(dragIndex, 1);
			next.splice(i, 0, moved);
			const reordered = next.map((s, idx) => ({ ...s, order: idx }));
			await projectStore.setScenes(project.id, reordered);
			dragIndex = null;
		};
	}
	function onDragEnd() {
		dragIndex = null;
	}

	async function generate() {
		if (!project || !avatar || !config) return;
		if (scenes.length === 0) {
			toast.error('Add at least one scene first');
			return;
		}
		try {
			await runProjectPipeline(project.id, { config, avatar });
		} catch (e) {
			console.error(e);
			toast.error(e instanceof Error ? e.message : 'Pipeline failed');
		}
	}

	async function retry(sceneId: string) {
		if (!project || !avatar || !config) return;
		try {
			await retryScene(project.id, sceneId, { config, avatar });
		} catch (e) {
			console.error(e);
			toast.error(e instanceof Error ? e.message : 'Retry failed');
		}
	}

	async function exportBundle() {
		if (!project) return;
		const { exportProjectBundle } = await import('$lib/pipeline/export');
		try {
			await exportProjectBundle(project, avatar);
			toast.success('Bundle downloaded');
		} catch (e) {
			console.error(e);
			toast.error(e instanceof Error ? e.message : 'Export failed');
		}
	}

	async function deleteProject() {
		if (!project) return;
		await projectStore.remove(project.id);
		jobStore.clearForProject(project.id);
		toast.success('Project deleted');
		await goto('/projects');
	}
</script>

<div class="flex h-full flex-col">
	<PageHeader title={project?.name ?? 'Storyboard'}>
		{#snippet actions()}
			<Button variant="ghost" size="sm" href="/projects" class="h-8 text-muted-foreground">
				<HIcon name="arrow-left-01" class="h-3.5 w-3.5" />
				Back
			</Button>
			{#if project}
				<Dialog.Root bind:open={confirmingDelete}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button variant="ghost" size="sm" class="h-8 text-muted-foreground hover:text-destructive" {...props}>
								<HIcon name="delete-02" class="h-3.5 w-3.5" />
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Delete this project?</Dialog.Title>
							<Dialog.Description>
								This permanently removes the storyboard and any generated audio, images, and lipsync
								videos.
							</Dialog.Description>
						</Dialog.Header>
						<Dialog.Footer>
							<Button variant="ghost" size="sm" onclick={() => (confirmingDelete = false)}>Cancel</Button>
							<Button variant="destructive" size="sm" onclick={deleteProject}>Delete</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>

				{#if allComplete}
					<Button variant="outline" size="sm" onclick={exportBundle} class="h-8">
						<HIcon name="download-01" class="h-3.5 w-3.5" />
						Export
					</Button>
				{/if}
				<Button
					size="sm"
					onclick={generate}
					disabled={isGenerating || scenes.length === 0}
					class="h-8"
				>
					{#if isGenerating}
						<HIcon name="loading-03" class="h-3.5 w-3.5 animate-spin" />
						Generating
					{:else if allComplete}
						<HIcon name="magic-wand-01" class="h-3.5 w-3.5" />
						Regenerate
					{:else}
						<HIcon name="magic-wand-01" class="h-3.5 w-3.5" />
						Generate all
					{/if}
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if !project}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
			<p class="text-[13px] text-muted-foreground">Project not found.</p>
			<a href="/projects" class="text-[12px] text-foreground/80 underline-offset-4 hover:underline">Back</a>
		</div>
	{:else}
		<div class="flex flex-1 overflow-hidden">
			<div class="bg-dot-grid relative flex-1 overflow-y-auto">
				<div class="mx-auto w-full max-w-[820px] px-6 py-10">
					{#if avatar}
						<div class="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
							<img
								src={avatar.referenceImageBase64}
								alt={avatar.name}
								class="h-9 w-9 rounded-md object-cover"
							/>
							<div class="flex flex-col leading-tight">
								<span class="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Starring</span>
								<span class="text-[13px] font-medium">{avatar.name}</span>
							</div>
						</div>
					{/if}

					<div class="flex flex-col gap-4">
						{#each scenes as scene, i (scene.id)}
							<SceneCard
								scene={scene}
								index={i}
								onChange={(p) => patchScene(scene.id, p)}
								onRemove={() => removeScene(scene.id)}
								onRetry={() => retry(scene.id)}
								dragging={dragIndex === i}
								onDragStart={onDragStart(i)}
								onDragOver={onDragOver(i)}
								onDrop={onDrop(i)}
								onDragEnd={onDragEnd}
							/>
						{/each}

						<button
							type="button"
							onclick={addScene}
							class="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card/30 py-5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
						>
							<HIcon name="add-01" class="h-3.5 w-3.5" />
							Add scene
						</button>
					</div>
				</div>
			</div>

			<aside class="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-surface px-5 py-6 lg:flex">
				<div class="flex flex-col gap-2">
					<p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
					<div class="flex flex-col gap-1.5 text-[13px]">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Total duration</span>
							<span class="tabular-nums">{formatDuration(cost.totalSeconds)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Avatar scenes</span>
							<span class="tabular-nums">{cost.avatarSceneCount}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">B-roll scenes</span>
							<span class="tabular-nums">{cost.brollSceneCount}</span>
						</div>
					</div>
				</div>

				<div class="flex flex-col gap-2 border-t border-border/60 pt-4">
					<p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lipsync model</p>
					<LipsyncModelPicker
						value={lipsyncProvider}
						avatarSeconds={cost.avatarSceneSeconds}
						onChange={changeLipsyncProvider}
					/>
				</div>

				<div class="border-t border-border/60 pt-4">
					<p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Estimated cost</p>
					<div class="mt-2 space-y-1 text-[12px]">
						<div class="flex justify-between text-muted-foreground">
							<span>Voiceovers</span>
							<span class="tabular-nums">{fmtUsd(cost.voiceover)}</span>
						</div>
						<div class="flex justify-between text-muted-foreground">
							<span>Avatar images</span>
							<span class="tabular-nums">{fmtUsd(cost.image)}</span>
						</div>
						<div class="flex justify-between text-muted-foreground">
							<span>Lipsync ({lipsyncModel.label})</span>
							<span class="tabular-nums">{fmtUsd(cost.lipsync)}</span>
						</div>
					</div>
					<div class="mt-3 flex items-baseline justify-between border-t border-border/60 pt-3">
						<span class="text-[12px] text-muted-foreground">Estimate</span>
						<span class="text-xl font-medium tabular-nums">{fmtUsd(cost.total)}</span>
					</div>
					{#if spent > 0}
						<div class="flex items-baseline justify-between">
							<span class="text-[12px] text-muted-foreground">Actually spent</span>
							<a
								href="/usage"
								class="text-[12px] tabular-nums text-foreground underline-offset-4 hover:underline"
							>
								{fmtUsd(spent)}
							</a>
						</div>
					{/if}
					<p class="mt-3 text-[10px] leading-relaxed text-muted-foreground">
						Voiceovers ~$0.30/min · gpt-image-2 $0.128/image · {lipsyncModel.label} ${lipsyncModel.pricePerSecond.toFixed(2)}/sec @ {lipsyncModel.defaultResolution}.
					</p>
				</div>
			</aside>
		</div>
	{/if}
</div>
