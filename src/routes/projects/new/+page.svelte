<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { configStore } from '$lib/stores/config';
	import { avatarStore } from '$lib/stores/avatars';
	import { projectStore } from '$lib/stores/projects';
	import { generateStoryboard } from '$lib/pipeline/storyboard';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Loader from '@lucide/svelte/icons/loader-2';
	import Wand from '@lucide/svelte/icons/wand-sparkles';

	const avatars = $derived($avatarStore.avatars);
	const config = $derived($configStore.config);

	let name = $state('');
	let avatarId = $state(page.url.searchParams.get('avatarId') ?? '');
	let script = $state('');
	let generating = $state(false);

	$effect(() => {
		if (!avatarId && avatars.length > 0) avatarId = avatars[0].id;
	});

	const selectedAvatar = $derived(avatars.find((a) => a.id === avatarId));
	const selectedAvatarLabel = $derived(selectedAvatar?.name ?? 'Pick an avatar');
	const wordCount = $derived(script.trim().split(/\s+/).filter(Boolean).length);

	async function generate() {
		if (!config) return;
		if (!name.trim()) {
			toast.error('Give the project a name');
			return;
		}
		if (!avatarId) {
			toast.error('Pick an avatar');
			return;
		}
		if (!script.trim()) {
			toast.error('Paste a script first');
			return;
		}
		if (script.trim().length < 40) {
			toast.error('Script is too short — give the agent something to work with');
			return;
		}

		generating = true;
		try {
			const project = await projectStore.create({
				name: name.trim(),
				avatarId,
				script: script.trim()
			});
			const scenes = await generateStoryboard(config, script);
			await projectStore.setScenes(project.id, scenes);
			toast.success(`Storyboard ready · ${scenes.length} scenes`);
			await goto(`/projects/${project.id}/storyboard`);
		} catch (e) {
			console.error(e);
			toast.error(e instanceof Error ? e.message : 'Storyboard generation failed');
			generating = false;
		}
	}
</script>

<div class="flex h-full flex-col">
	<PageHeader title="New project">
		{#snippet actions()}
			<Button variant="ghost" size="sm" href="/projects" class="h-8 text-muted-foreground">
				<ArrowLeft class="h-3.5 w-3.5" />
				Cancel
			</Button>
			<Button size="sm" onclick={generate} disabled={generating} class="h-8">
				{#if generating}
					<Loader class="h-3.5 w-3.5 animate-spin" />
					Generating
				{:else}
					<Wand class="h-3.5 w-3.5" />
					Generate storyboard
				{/if}
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
			<div class="flex flex-col gap-5">
				<div class="flex flex-col gap-1.5">
					<Label class="text-[11px] font-medium text-muted-foreground">Project name</Label>
					<Input
						value={name}
						oninput={(e) => (name = (e.target as HTMLInputElement).value)}
						placeholder="AI content video"
						class="h-9"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between">
						<Label class="text-[11px] font-medium text-muted-foreground">Script</Label>
						<span class="text-[11px] tabular-nums text-muted-foreground">{wordCount} words</span>
					</div>
					<Textarea
						value={script}
						oninput={(e) => (script = (e.target as HTMLTextAreaElement).value)}
						placeholder={`[confident] Most businesses are using AI for content the wrong way.\n\n[slightly mocking] They open ChatGPT, type "give me content ideas for my brand", and get back the same generic list...`}
						rows={20}
						class="resize-y font-mono text-[12px] leading-relaxed"
					/>
					<p class="text-[11px] text-muted-foreground">
						ElevenLabs v3 audio tags like <code class="rounded bg-muted px-1 font-mono">[confident]</code>
						or <code class="rounded bg-muted px-1 font-mono">[pause]</code> pass through to the
						voiceover.
					</p>
				</div>
			</div>

			<aside class="flex flex-col gap-5">
				<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-[11px] font-medium text-muted-foreground">Starring avatar</Label>
						<Select.Root type="single" bind:value={avatarId}>
							<Select.Trigger class="h-9 w-full text-[13px]">{selectedAvatarLabel}</Select.Trigger>
							<Select.Content>
								{#each avatars as avatar (avatar.id)}
									<Select.Item value={avatar.id}>{avatar.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					{#if selectedAvatar}
						<div class="flex items-center gap-2.5 rounded-lg bg-background/40 p-2.5">
							<img
								src={selectedAvatar.referenceImageBase64}
								alt={selectedAvatar.name}
								class="h-10 w-10 rounded-md object-cover"
							/>
							<div class="min-w-0 flex-1">
								<div class="truncate text-[13px] font-medium">{selectedAvatar.name}</div>
								<div class="truncate text-[11px] text-muted-foreground">
									{configStore.findVoice(config, selectedAvatar.voiceId)?.label ?? 'Voice missing'}
								</div>
							</div>
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
					<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">What happens next</p>
					<ol class="space-y-1.5 text-[12px] text-muted-foreground">
						<li>1. Claude breaks the script into avatar + b-roll scenes</li>
						<li>2. Review and edit every shot</li>
						<li>3. Generate — voiceovers, images, lipsync run in parallel</li>
					</ol>
				</div>
			</aside>
		</div>
	</div>
</div>
