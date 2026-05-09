<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		total: number;
		current: number;
		labels?: string[];
	}

	let { total, current, labels = [] }: Props = $props();
</script>

<div class="flex items-center gap-2">
	{#each Array(total) as _, i}
		{@const isActive = i === current}
		{@const isDone = i < current}
		<div class="flex items-center gap-1.5">
			<div
				class={cn(
					'h-1.5 w-6 rounded-full transition-colors',
					isActive && 'bg-foreground',
					isDone && 'bg-foreground/50',
					!isActive && !isDone && 'bg-border'
				)}
			></div>
			{#if labels[i] && isActive}
				<span class="hidden text-[11px] font-medium text-foreground sm:inline">
					{labels[i]}
				</span>
			{/if}
		</div>
	{/each}
</div>
