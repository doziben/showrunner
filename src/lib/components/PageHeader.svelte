<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		title: string;
		searchPlaceholder?: string;
		search?: string;
		onSearch?: (value: string) => void;
		actions?: import('svelte').Snippet;
		class?: string;
	}

	let {
		title,
		searchPlaceholder,
		search = $bindable(''),
		onSearch,
		actions,
		class: className
	}: Props = $props();

	function handleInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		search = v;
		onSearch?.(v);
	}
</script>

<header
	class={cn(
		'flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur',
		className
	)}
>
	<div class="flex min-w-0 flex-1 items-center gap-2">
		<h1 class="truncate text-[15px] font-medium text-foreground">{title}</h1>
	</div>

	{#if searchPlaceholder}
		<div class="relative hidden w-full max-w-md md:block">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="7" />
				<path d="m20 20-3-3" stroke-linecap="round" />
			</svg>
			<input
				type="text"
				value={search}
				oninput={handleInput}
				placeholder={searchPlaceholder}
				class="h-9 w-full rounded-lg border border-border bg-input/60 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-border-strong focus:bg-input focus:outline-none"
			/>
		</div>
	{:else}
		<div class="flex-1"></div>
	{/if}

	<div class="flex items-center gap-1.5">
		{@render actions?.()}
	</div>
</header>
