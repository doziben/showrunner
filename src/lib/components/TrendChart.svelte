<script lang="ts">
	import { fmtUsd } from '$lib/helpers/cost';
	import { KIND_META } from '$lib/helpers/transactions';
	import type { TxKind } from '$lib/types';

	interface Bucket {
		day: number;
		total: number;
		byKind: Record<TxKind, number>;
	}

	interface Props {
		buckets: Bucket[];
		height?: number;
	}

	let { buckets, height = 200 }: Props = $props();

	const max = $derived(Math.max(...buckets.map((b) => b.total), 0.001));
	const niceMax = $derived(Math.max(roundUpNice(max), 0.05));

	const order: TxKind[] = ['storyboard', 'voiceover', 'avatar-portrait', 'avatar-shot', 'lipsync'];

	function roundUpNice(v: number): number {
		if (v <= 0) return 0;
		const exp = Math.floor(Math.log10(v));
		const base = Math.pow(10, exp);
		const m = v / base;
		const niceM = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
		return niceM * base;
	}

	function fmtDate(ms: number) {
		return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	let hoverIdx = $state<number | null>(null);
</script>

<div class="relative w-full" style:height="{height + 24}px">
	<!-- y-axis ghost lines -->
	<div class="pointer-events-none absolute inset-x-0 top-0" style:height="{height}px">
		{#each [1, 0.66, 0.33] as ratio}
			<div
				class="absolute inset-x-0 border-t border-border/30"
				style:top="{(1 - ratio) * height}px"
			></div>
		{/each}
	</div>
	<div class="absolute right-0 top-0 -translate-y-3 text-[10px] tabular-nums text-muted-foreground">
		{fmtUsd(niceMax)}
	</div>

	<!-- bars -->
	<div class="flex h-full items-end gap-[2px]" style:height="{height}px">
		{#each buckets as bucket, i}
			{@const heightPct = (bucket.total / niceMax) * 100}
			<button
				type="button"
				class="group relative flex h-full flex-1 flex-col justify-end overflow-hidden rounded-sm transition-opacity"
				class:opacity-50={hoverIdx !== null && hoverIdx !== i}
				onmouseenter={() => (hoverIdx = i)}
				onmouseleave={() => (hoverIdx = null)}
				aria-label={`${fmtDate(bucket.day)}: ${fmtUsd(bucket.total)}`}
			>
				{#if bucket.total > 0}
					<div class="flex w-full flex-col-reverse" style:height="{heightPct}%">
						{#each order as kind}
							{@const v = bucket.byKind[kind]}
							{#if v > 0}
								<div
									class={KIND_META[kind].tone}
									style:height="{(v / bucket.total) * 100}%"
								></div>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="h-px w-full bg-border/40"></div>
				{/if}

				{#if hoverIdx === i}
					<div
						class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1.5 text-[11px] text-foreground shadow-lift"
					>
						<div class="text-muted-foreground">{fmtDate(bucket.day)}</div>
						<div class="font-medium tabular-nums">{fmtUsd(bucket.total)}</div>
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- x-axis labels (first / middle / last) -->
	<div class="mt-2 flex justify-between text-[10px] text-muted-foreground">
		<span>{fmtDate(buckets[0]?.day ?? Date.now())}</span>
		{#if buckets.length > 6}
			<span>{fmtDate(buckets[Math.floor(buckets.length / 2)].day)}</span>
		{/if}
		<span>{fmtDate(buckets.at(-1)?.day ?? Date.now())}</span>
	</div>
</div>
