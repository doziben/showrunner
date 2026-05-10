<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils';
	import { estimateSeconds } from '$lib/helpers/duration';
	import type { Scene } from '$lib/types';
	import HIcon from '$lib/components/HIcon.svelte';

	interface Props {
		scene: Scene;
		index: number;
		onChange: (partial: Partial<Scene>) => void;
		onRemove: () => void;
		onRetry?: () => void;
		dragging?: boolean;
		onDragStart?: (e: DragEvent) => void;
		onDragOver?: (e: DragEvent) => void;
		onDrop?: (e: DragEvent) => void;
		onDragEnd?: (e: DragEvent) => void;
	}

	let {
		scene,
		index,
		onChange,
		onRemove,
		onRetry,
		dragging = false,
		onDragStart,
		onDragOver,
		onDrop,
		onDragEnd
	}: Props = $props();

	const typeLabel = $derived(scene.type === 'avatar' ? 'AVATAR' : 'B-ROLL');

	const framingLabel = $derived(
		scene.framing === 'close-up' ? 'Close-up' : scene.framing === 'wide' ? 'Wide' : 'Medium'
	);

	function recomputeDuration() {
		onChange({ durationSeconds: estimateSeconds(scene.audioLine) });
	}
</script>

<div class="flex flex-col gap-1.5">
	<!-- Tiny tracked label above the block (Flora pattern) -->
	<div class="flex items-center gap-2 px-1">
		<span class="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
			Scene {String(index + 1).padStart(2, '0')} · {typeLabel}
		</span>
		{#if scene.status === 'complete'}
			<span class="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-emerald-400/90">
				<HIcon name="tick-02" class="h-2.5 w-2.5" />
				Done
			</span>
		{:else if scene.status === 'failed'}
			<span class="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-destructive">
				<HIcon name="alert-02" class="h-2.5 w-2.5" />
				Failed
			</span>
		{:else if scene.status !== 'pending'}
			<span class="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
				<HIcon name="loading-03" class="h-2.5 w-2.5 animate-spin" />
				{scene.status === 'generating-voiceover'
					? 'Voiceover'
					: scene.status === 'generating-image'
						? 'Image'
						: 'Lipsync'}
			</span>
		{/if}
	</div>

	<article
		draggable="true"
		ondragstart={onDragStart}
		ondragover={onDragOver}
		ondrop={onDrop}
		ondragend={onDragEnd}
		class={cn(
			'group flex gap-2.5 rounded-xl border bg-card p-4 transition-all',
			dragging
				? 'border-border-strong opacity-40'
				: 'border-border hover:border-border-strong'
		)}
	>
		<button
			type="button"
			class="mt-1 cursor-grab self-start rounded p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-muted hover:text-foreground active:cursor-grabbing group-hover:opacity-100"
			aria-label="Drag to reorder"
			tabindex={-1}
		>
			<HIcon name="drag-02" class="h-3.5 w-3.5" />
		</button>

		<div class="flex flex-1 flex-col gap-3">
			<!-- Controls row -->
			<div class="flex flex-wrap items-center gap-2">
				<Select.Root
					type="single"
					value={scene.type}
					onValueChange={(v) => onChange({ type: v as Scene['type'] })}
				>
					<Select.Trigger class="h-7 rounded-md border-border bg-background/40 px-2.5 text-[11px]">
						<span class="flex items-center gap-1.5">
							<span
								class={cn(
									'h-1.5 w-1.5 rounded-full',
									scene.type === 'avatar' ? 'bg-foreground' : 'bg-muted-foreground/60'
								)}
							></span>
							{scene.type === 'avatar' ? 'Avatar' : 'B-roll'}
						</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="avatar">Avatar</Select.Item>
						<Select.Item value="broll">B-roll</Select.Item>
					</Select.Content>
				</Select.Root>

				{#if scene.type === 'avatar'}
					<Select.Root
						type="single"
						value={scene.framing ?? 'medium'}
						onValueChange={(v) => onChange({ framing: v as Scene['framing'] })}
					>
						<Select.Trigger class="h-7 rounded-md border-border bg-background/40 px-2.5 text-[11px]">
							{framingLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="medium">Medium</Select.Item>
							<Select.Item value="close-up">Close-up</Select.Item>
							<Select.Item value="wide">Wide</Select.Item>
						</Select.Content>
					</Select.Root>
				{/if}

				<div class="flex items-center gap-1 rounded-md border border-border bg-background/40 px-1.5 py-0.5">
					<input
						type="number"
						value={scene.durationSeconds}
						min={1}
						max={30}
						oninput={(e) =>
							onChange({ durationSeconds: Number((e.target as HTMLInputElement).value) })}
						class="h-6 w-10 bg-transparent text-center text-[11px] tabular-nums focus:outline-none"
					/>
					<span class="text-[11px] text-muted-foreground">s</span>
				</div>

				<button
					type="button"
					onclick={recomputeDuration}
					class="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
				>
					Auto
				</button>

				<div class="ml-auto flex items-center gap-1">
					{#if scene.status === 'failed' && onRetry}
						<Button variant="ghost" size="sm" onclick={onRetry} class="h-7 text-[11px]">
							<HIcon name="rotate-left-01" class="h-3 w-3" />
							Retry
						</Button>
					{/if}
					<button
						type="button"
						onclick={onRemove}
						aria-label="Delete scene"
						class="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-destructive"
					>
						<HIcon name="delete-02" class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			<!-- SPOKEN — the actual line that gets voiced. Visually primary. -->
			<div class="flex items-start gap-3">
				<span
					class="mt-[7px] shrink-0 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70"
					>Spoken</span
				>
				<Textarea
					value={scene.audioLine}
					oninput={(e) => onChange({ audioLine: (e.target as HTMLTextAreaElement).value })}
					rows={2}
					class="flex-1 border-0 bg-transparent p-0 text-[15px] leading-snug text-foreground shadow-none focus-visible:ring-0"
					placeholder="What is spoken in this scene…"
				/>
			</div>

			<!-- Section divider with DIRECTION label -->
			<div class="flex items-center gap-3 pt-0.5">
				<div class="h-px flex-1 bg-border/50"></div>
				<span
					class="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60"
				>
					Direction
				</span>
				<div class="h-px flex-1 bg-border/50"></div>
			</div>

			<!-- Direction panel — recessed background + labeled subfields. -->
			<div class="flex flex-col gap-3 rounded-lg bg-background/40 p-3">
				{#if scene.type === 'avatar'}
					<div class="flex flex-col gap-1.5">
						<span
							class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70"
						>
							Action
						</span>
						<Textarea
							value={scene.actionDescription ?? ''}
							oninput={(e) =>
								onChange({ actionDescription: (e.target as HTMLTextAreaElement).value })}
							rows={2}
							placeholder="Leaning forward, knowing smirk forming, hand entering frame…"
							class="border-0 bg-transparent p-0 text-[12px] leading-relaxed text-muted-foreground shadow-none focus-visible:ring-0"
						/>
					</div>
				{:else}
					<div class="flex flex-col gap-1.5">
						<span
							class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70"
						>
							Shot
						</span>
						<Textarea
							value={scene.shotDescription ?? ''}
							oninput={(e) =>
								onChange({ shotDescription: (e.target as HTMLTextAreaElement).value })}
							rows={2}
							placeholder="What the viewer sees on screen…"
							class="border-0 bg-transparent p-0 text-[12px] leading-relaxed text-muted-foreground shadow-none focus-visible:ring-0"
						/>
					</div>
					<div class="h-px bg-border/40"></div>
					<div class="flex flex-col gap-1.5">
						<span
							class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70"
						>
							Recording
						</span>
						<Textarea
							value={scene.recordingInstructions ?? ''}
							oninput={(e) =>
								onChange({ recordingInstructions: (e.target as HTMLTextAreaElement).value })}
							rows={3}
							placeholder="Open ChatGPT, type X, capture as 9:16…"
							class="border-0 bg-transparent p-0 text-[12px] leading-relaxed text-muted-foreground shadow-none focus-visible:ring-0"
						/>
					</div>
				{/if}
			</div>

			{#if scene.status === 'failed' && scene.errorMessage}
				<p class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
					{scene.errorMessage}
				</p>
			{/if}

			{#if scene.voiceoverBase64 || scene.lipsyncVideoBase64 || scene.avatarImageBase64}
				<div class="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
					{#if scene.lipsyncVideoBase64}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							src={scene.lipsyncVideoBase64}
							controls
							class="h-32 rounded-md ring-1 ring-border"
						></video>
					{:else if scene.avatarImageBase64}
						<img
							src={scene.avatarImageBase64}
							alt="Scene preview"
							class="h-32 rounded-md object-cover ring-1 ring-border"
						/>
					{/if}
					{#if scene.voiceoverBase64}
						<audio src={scene.voiceoverBase64} controls class="h-8"></audio>
					{/if}
				</div>
			{/if}
		</div>
	</article>
</div>
