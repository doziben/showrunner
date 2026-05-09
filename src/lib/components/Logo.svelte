<script lang="ts">
	import { cn } from '$lib/utils';
	let { class: className }: { class?: string } = $props();
</script>

<a href="/" class={cn('flex items-center gap-2 text-foreground', className)} aria-label="Showrunner">
	<span
		class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background shadow-soft"
	>
		<svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M5 4h11.5a2.5 2.5 0 0 1 0 5H8.5a2.5 2.5 0 0 0 0 5h7a2.5 2.5 0 0 1 0 5H4"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	</span>
	<span class="font-display text-lg leading-none tracking-tight">Showrunner</span>
</a>
