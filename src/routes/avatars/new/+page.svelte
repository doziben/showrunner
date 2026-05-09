<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { configStore } from '$lib/stores/config';
	import { avatarStore } from '$lib/stores/avatars';
	import { generateAvatarPortraits } from '$lib/pipeline/avatar-image';
	import { fileToBase64 } from '$lib/helpers/image';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Upload from '@lucide/svelte/icons/upload';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader-2';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	const config = $derived($configStore.config);
	const voices = $derived(config?.voices ?? []);

	let name = $state('');
	let description = $state('');
	let voiceId = $state('');

	$effect(() => {
		if (!voiceId && voices.length > 0) voiceId = voices[0].id;
	});

	const PRESETS = [
		{
			label: 'Cozy creator',
			prompt:
				'Woman in her late 20s, mixed race, warm cream sweater, soft natural makeup, curly dark hair pulled back, friendly conversational expression'
		},
		{
			label: 'Founder energy',
			prompt:
				'Man in his early 30s, slim athletic build, plain charcoal t-shirt, short dark hair, focused intelligent eyes, slight smile'
		},
		{
			label: 'Editorial elegance',
			prompt:
				'Woman in her mid 30s, East Asian features, oversized linen shirt, natural curly hair, minimal jewelry, calm confident expression'
		}
	];

	let mode = $state<'generate' | 'import'>('generate');

	let generating = $state(false);
	let variations = $state<{ base64: string; seed: number }[]>([]);
	let selectedIndex = $state<number | null>(null);

	let importPreview = $state<string | null>(null);

	async function generate() {
		if (!config) return;
		if (!description.trim()) {
			toast.error('Add a description first');
			return;
		}
		generating = true;
		variations = [];
		selectedIndex = null;
		try {
			const results = await generateAvatarPortraits({
				prompt: description.trim(),
				apiKey: config.replicateKey,
				count: 4
			});
			variations = results;
			selectedIndex = 0;
		} catch (e) {
			console.error(e);
			toast.error(e instanceof Error ? e.message : 'Image generation failed');
		} finally {
			generating = false;
		}
	}

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (file.size > 8 * 1024 * 1024) {
			toast.error('Image must be under 8MB');
			return;
		}
		importPreview = await fileToBase64(file);
	}

	let saving = $state(false);

	async function save() {
		if (!name.trim()) {
			toast.error('Give the avatar a name');
			return;
		}
		if (!voiceId) {
			toast.error('Pick a voice');
			return;
		}

		saving = true;
		try {
			let referenceImageBase64 = '';
			let seed: number | undefined;
			let savedDescription = '';

			if (mode === 'generate') {
				if (selectedIndex === null || !variations[selectedIndex]) {
					toast.error('Pick a portrait variation first');
					saving = false;
					return;
				}
				referenceImageBase64 = variations[selectedIndex].base64;
				seed = variations[selectedIndex].seed;
				savedDescription = description.trim();
			} else {
				if (!importPreview) {
					toast.error('Upload an image first');
					saving = false;
					return;
				}
				referenceImageBase64 = importPreview;
				savedDescription = '';
			}

			const created = await avatarStore.create({
				name: name.trim(),
				description: savedDescription,
				referenceImageBase64,
				voiceId,
				seed
			});
			toast.success('Avatar created');
			await goto(`/avatars/${created.id}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save avatar');
		} finally {
			saving = false;
		}
	}

	const selectedVoiceLabel = $derived(voices.find((v) => v.id === voiceId)?.label ?? 'Pick a voice');
</script>

<div class="flex h-full flex-col">
	<PageHeader title="New avatar">
		{#snippet actions()}
			<Button variant="ghost" size="sm" href="/avatars" class="h-8 text-muted-foreground">
				<ArrowLeft class="h-3.5 w-3.5" />
				Cancel
			</Button>
			<Button size="sm" onclick={save} disabled={saving} class="h-8">
				{saving ? 'Saving…' : 'Save avatar'}
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
			<div class="flex flex-col gap-5">
				<Tabs.Root
					value={mode}
					onValueChange={(v) => (mode = v as 'generate' | 'import')}
					class="w-full"
				>
					<Tabs.List class="grid w-full grid-cols-2">
						<Tabs.Trigger value="generate" class="text-[12px]">
							<Sparkles class="h-3.5 w-3.5" />
							Generate with AI
						</Tabs.Trigger>
						<Tabs.Trigger value="import" class="text-[12px]">
							<Upload class="h-3.5 w-3.5" />
							Import existing
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="generate" class="mt-5 flex flex-col gap-4">
						<div class="flex flex-col gap-2">
							<Label class="text-[11px] font-medium text-muted-foreground">Description</Label>
							<Textarea
								value={description}
								oninput={(e) => (description = (e.target as HTMLTextAreaElement).value)}
								placeholder="Woman in her late 20s, mixed race, cream sweater, home office..."
								rows={3}
								class="text-[13px]"
							/>
							<div class="flex flex-wrap gap-1.5">
								{#each PRESETS as preset}
									<button
										type="button"
										onclick={() => (description = preset.prompt)}
										class="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
									>
										{preset.label}
									</button>
								{/each}
							</div>
						</div>

						<Button
							size="sm"
							class="h-8 self-start"
							onclick={generate}
							disabled={generating || !description.trim()}
						>
							{#if generating}
								<Loader class="h-3.5 w-3.5 animate-spin" />
								Generating 4 variations
							{:else}
								<Sparkles class="h-3.5 w-3.5" />
								Generate avatar
							{/if}
						</Button>

						{#if variations.length > 0}
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{#each variations as variation, i}
									<button
										type="button"
										onclick={() => (selectedIndex = i)}
										class={cn(
											'group relative aspect-[4/5] overflow-hidden rounded-lg ring-1 transition-all',
											selectedIndex === i
												? 'ring-2 ring-foreground'
												: 'opacity-80 ring-border hover:opacity-100 hover:ring-border-strong'
										)}
									>
										<img
											src={variation.base64}
											alt={`Variation ${i + 1}`}
											class="h-full w-full object-cover"
										/>
										{#if selectedIndex === i}
											<div
												class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
											>
												<Check class="h-3 w-3" />
											</div>
										{/if}
									</button>
								{/each}
							</div>
						{:else if generating}
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{#each Array(4) as _, i}
									<div class="aspect-[4/5] animate-pulse rounded-lg bg-muted"></div>
								{/each}
							</div>
						{/if}
					</Tabs.Content>

					<Tabs.Content value="import" class="mt-5 flex flex-col gap-4">
						<label
							class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-10 transition-colors hover:border-border-strong"
						>
							<div
								class="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground"
							>
								<Upload class="h-4 w-4" />
							</div>
							<div class="text-center">
								<p class="text-[13px] font-medium text-foreground">Drop or click to upload</p>
								<p class="mt-0.5 text-[12px] text-muted-foreground">JPG or PNG · 9:16 framing works best</p>
							</div>
							<input
								type="file"
								accept="image/png,image/jpeg"
								onchange={handleImport}
								class="hidden"
							/>
						</label>

						{#if importPreview}
							<div class="flex justify-center">
								<img
									src={importPreview}
									alt="Imported reference"
									class="h-72 w-auto rounded-xl object-cover ring-1 ring-border"
								/>
							</div>
						{/if}
					</Tabs.Content>
				</Tabs.Root>
			</div>

			<aside class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium text-muted-foreground">Avatar name</Label>
					<Input
						value={name}
						oninput={(e) => (name = (e.target as HTMLInputElement).value)}
						placeholder="Maya"
						class="h-9"
					/>
				</div>

				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium text-muted-foreground">Voice</Label>
					<Select.Root type="single" bind:value={voiceId}>
						<Select.Trigger class="h-9 w-full text-[13px]">{selectedVoiceLabel}</Select.Trigger>
						<Select.Content>
							{#each voices as voice (voice.id)}
								<Select.Item value={voice.id}>{voice.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<p class="text-[11px] text-muted-foreground">
						Manage voices in
						<a href="/settings" class="text-foreground/80 underline-offset-4 hover:underline"
							>Settings</a
						>.
					</p>
				</div>
			</aside>
		</div>
	</div>
</div>
