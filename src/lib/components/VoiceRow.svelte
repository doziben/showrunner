<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import Trash from '@lucide/svelte/icons/trash-2';
	import Play from '@lucide/svelte/icons/play';
	import Loader from '@lucide/svelte/icons/loader-2';
	import { testElevenLabsVoice } from '$lib/pipeline/test-connections';
	import type { Voice } from '$lib/types';
	import { toast } from 'svelte-sonner';

	interface Props {
		voice: Voice;
		elevenLabsKey: string;
		canRemove: boolean;
		onChange: (voice: Voice) => void;
		onRemove: () => void;
	}

	let { voice, elevenLabsKey, canRemove, onChange, onRemove }: Props = $props();

	let testing = $state(false);
	let audio: HTMLAudioElement | null = $state(null);

	async function preview() {
		if (!elevenLabsKey) {
			toast.error('Add your ElevenLabs key first');
			return;
		}
		if (!voice.elevenLabsVoiceId.trim()) {
			toast.error('Enter a voice ID first');
			return;
		}
		testing = true;
		try {
			const blob = await testElevenLabsVoice(elevenLabsKey, voice.elevenLabsVoiceId.trim());
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
</script>

<div
	class="grid grid-cols-1 items-end gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
>
	<div class="flex flex-col gap-1">
		<Label class="text-[11px] text-muted-foreground">Label</Label>
		<Input
			value={voice.label}
			oninput={(e) => onChange({ ...voice, label: (e.target as HTMLInputElement).value })}
			placeholder="Energetic Female"
			class="h-8 text-[12px]"
		/>
	</div>
	<div class="flex flex-col gap-1">
		<Label class="text-[11px] text-muted-foreground">ElevenLabs Voice ID</Label>
		<Input
			value={voice.elevenLabsVoiceId}
			oninput={(e) =>
				onChange({ ...voice, elevenLabsVoiceId: (e.target as HTMLInputElement).value })}
			placeholder="EXAVITQu4vr4xnSDxMaL"
			class="h-8 font-mono text-[11px]"
		/>
	</div>
	<Button
		variant="outline"
		size="sm"
		onclick={preview}
		disabled={testing || !voice.elevenLabsVoiceId.trim()}
		class="h-8 text-[11px]"
	>
		{#if testing}
			<Loader class="h-3 w-3 animate-spin" />
			Test
		{:else}
			<Play class="h-3 w-3" />
			Test
		{/if}
	</Button>
	<button
		type="button"
		onclick={onRemove}
		disabled={!canRemove}
		aria-label="Remove voice"
		class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
	>
		<Trash class="h-3.5 w-3.5" />
	</button>
	<audio bind:this={audio} class="hidden"></audio>
</div>
