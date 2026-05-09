<script lang="ts">
	import { cn } from '$lib/utils';
	import { LIPSYNC_MODELS } from '$lib/pipeline/lipsync-models';
	import { fmtUsd } from '$lib/helpers/cost';
	import type { LipsyncProvider } from '$lib/types';
	import Check from '@lucide/svelte/icons/check';

	interface Props {
		value: LipsyncProvider;
		avatarSeconds?: number;
		onChange: (provider: LipsyncProvider) => void;
	}

	let { value, avatarSeconds = 0, onChange }: Props = $props();

	const order: LipsyncProvider[] = ['p-video', 'fabric', 'aurora'];
</script>

<div class="flex flex-col gap-1.5">
	{#each order as id (id)}
		{@const model = LIPSYNC_MODELS[id]}
		{@const selected = value === id}
		{@const projectedCost = avatarSeconds * model.pricePerSecond}
		<button
			type="button"
			onclick={() => onChange(id)}
			class={cn(
				'group flex flex-col gap-1 rounded-lg border bg-card px-3 py-2.5 text-left transition-all',
				selected
					? 'border-foreground/70 ring-1 ring-foreground/20'
					: 'border-border hover:border-border-strong'
			)}
		>
			<div class="flex items-center gap-2">
				<span
					class={cn(
						'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
						selected
							? 'border-foreground bg-foreground text-background'
							: 'border-border-strong'
					)}
				>
					{#if selected}
						<Check class="h-2.5 w-2.5" />
					{/if}
				</span>
				<span class="flex-1 text-[12.5px] font-medium text-foreground">{model.label}</span>
				<span class="text-[11px] tabular-nums text-muted-foreground">
					{fmtUsd(model.pricePerSecond)}/sec
				</span>
			</div>
			<div class="flex items-center justify-between pl-5.5">
				<span class="text-[11px] text-muted-foreground">
					{model.tagline} · {model.provider === 'replicate' ? 'Replicate' : 'fal.ai'}
				</span>
				{#if avatarSeconds > 0}
					<span class="text-[11px] tabular-nums text-muted-foreground">
						≈ {fmtUsd(projectedCost)}
					</span>
				{/if}
			</div>
		</button>
	{/each}
</div>
