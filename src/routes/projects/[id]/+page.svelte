<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	onMount(() => {
		goto(`/projects/${page.params.id}/storyboard`, { replaceState: true });
	});
</script>

<div class="flex h-full min-h-[60vh] items-center justify-center text-muted-foreground">
	<p class="text-sm">Loading…</p>
</div>
