<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
	import { mode } from "mode-watcher";
	import HIcon from '$lib/components/HIcon.svelte';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme={mode.current}
	class="toaster group"
	style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
	{...restProps}
>
	{#snippet loadingIcon()}
		<HIcon name="loading-03" class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<HIcon name="checkmark-circle-01" class="size-4" />
	{/snippet}
	{#snippet errorIcon()}
		<HIcon name="octagon-x" class="size-4" />
	{/snippet}
	{#snippet infoIcon()}
		<HIcon name="information-circle" class="size-4" />
	{/snippet}
	{#snippet warningIcon()}
		<HIcon name="alert-02" class="size-4" />
	{/snippet}
</Sonner>
