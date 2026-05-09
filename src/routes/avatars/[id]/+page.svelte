<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { configStore } from '$lib/stores/config';
	import { avatarStore } from '$lib/stores/avatars';
	import { testElevenLabsVoice } from '$lib/pipeline/test-connections';
	import type { Avatar } from '$lib/types';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Trash from '@lucide/svelte/icons/trash-2';
	import Play from '@lucide/svelte/icons/play';
	import Loader from '@lucide/svelte/icons/loader-2';
	import { toast } from 'svelte-sonner';

	const id = $derived(page.params.id);
	const avatar = $derived<Avatar | undefined>($avatarStore.avatars.find((a) => a.id === id));
	const config = $derived($configStore.config);
	const voice = $derived(avatar ? configStore.findVoice(config, avatar.voiceId) : undefined);

	let confirming = $state(false);
	let testing = $state(false);
	let audio: HTMLAudioElement | null = $state(null);

	async function previewVoice() {
		if (!voice || !config) return;
		testing = true;
		try {
			const blob = await testElevenLabsVoice(config.elevenLabsKey, voice.elevenLabsVoiceId);
			const url = URL.createObjectURL(blob);
			if (audio) {
				audio.src = url;
				await audio.play();
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Voice test failed');
		} finally {
			testing = false;
		}
	}

	async function remove() {
		if (!avatar) return;
		await avatarStore.remove(avatar.id);
		toast.success('Avatar deleted');
		await goto('/avatars');
	}
</script>

<div class="flex h-full flex-col">
	<PageHeader title={avatar?.name ?? 'Avatar'}>
		{#snippet actions()}
			<Button variant="ghost" size="sm" href="/avatars" class="h-8 text-muted-foreground">
				<ArrowLeft class="h-3.5 w-3.5" />
				Back
			</Button>
			{#if avatar}
				<Button size="sm" href={`/projects/new?avatarId=${avatar.id}`} class="h-8">
					Start a project
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if !avatar}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
			<p class="text-[13px] text-muted-foreground">Avatar not found.</p>
			<a href="/avatars" class="text-[12px] text-foreground/80 underline-offset-4 hover:underline">Back to avatars</a>
		</div>
	{:else}
		<div class="flex-1 overflow-y-auto">
			<div class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[400px_1fr]">
				<div class="aspect-[4/5] overflow-hidden rounded-xl bg-card ring-1 ring-border">
					<img
						src={avatar.referenceImageBase64}
						alt={avatar.name}
						class="h-full w-full object-cover"
					/>
				</div>

				<div class="flex flex-col gap-6">
					<div>
						<p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Avatar</p>
						<h2 class="mt-1.5 text-2xl font-medium text-foreground">{avatar.name}</h2>
						{#if avatar.description}
							<p class="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
								{avatar.description}
							</p>
						{/if}
					</div>

					<div class="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
						<div class="flex flex-col gap-0.5">
							<span class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Voice</span>
							<span class="text-[13px] font-medium">{voice?.label ?? 'Unknown'}</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Voice ID</span>
							<span class="font-mono text-[11px] text-foreground/80">{voice?.elevenLabsVoiceId ?? '—'}</span>
						</div>
						<div class="flex items-center gap-2 sm:col-span-2">
							<Button variant="outline" size="sm" onclick={previewVoice} disabled={!voice || testing} class="h-8">
								{#if testing}
									<Loader class="h-3.5 w-3.5 animate-spin" />
									Loading
								{:else}
									<Play class="h-3.5 w-3.5" />
									Play sample
								{/if}
							</Button>
						</div>
					</div>

					<div class="flex items-center gap-2 border-t border-border pt-5">
						<Dialog.Root bind:open={confirming}>
							<Dialog.Trigger>
								{#snippet child({ props })}
									<Button variant="outline" size="sm" class="h-8 text-destructive" {...props}>
										<Trash class="h-3.5 w-3.5" />
										Delete
									</Button>
								{/snippet}
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Delete this avatar?</Dialog.Title>
									<Dialog.Description>
										This removes the locked reference and saved metadata. Existing projects keep
										their generated outputs but cannot regenerate scenes.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Button variant="ghost" size="sm" onclick={() => (confirming = false)}>Cancel</Button>
									<Button variant="destructive" size="sm" onclick={remove}>Delete</Button>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</div>
				</div>
			</div>
			<audio bind:this={audio} class="hidden"></audio>
		</div>
	{/if}
</div>
