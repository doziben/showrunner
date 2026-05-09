<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { avatarStore } from '$lib/stores/avatars';
	import { configStore } from '$lib/stores/config';
	import AvatarCard from '$lib/components/AvatarCard.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';

	let search = $state('');

	const avatars = $derived(
		$avatarStore.avatars.filter((a) =>
			search.trim() ? a.name.toLowerCase().includes(search.trim().toLowerCase()) : true
		)
	);

	function voiceLabel(voiceId: string) {
		return configStore.findVoice($configStore.config, voiceId)?.label;
	}
</script>

<div class="flex h-full flex-col">
	<PageHeader title="Avatars" searchPlaceholder="Search avatars" bind:search>
		{#snippet actions()}
			<Button href="/avatars/new" size="sm" class="h-8">
				<Plus class="h-3.5 w-3.5" />
				New avatar
			</Button>
		{/snippet}
	</PageHeader>

	<div class="flex-1 overflow-y-auto px-6 py-8">
		{#if $avatarStore.avatars.length === 0}
			<div class="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground"
				>
					<LayoutGrid class="h-4 w-4" />
				</div>
				<div class="space-y-1.5">
					<p class="text-[15px] font-medium text-foreground">No avatars yet</p>
					<p class="text-[13px] text-muted-foreground">
						Lock a reference portrait once. Showrunner reuses it across every scene so the same
						person appears throughout your video.
					</p>
				</div>
				<Button href="/avatars/new" size="sm" class="mt-2 h-8">
					<Plus class="h-3.5 w-3.5" />
					Create avatar
				</Button>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				<a
					href="/avatars/new"
					class="group flex flex-col gap-2"
				>
					<div
						class="flex aspect-[4/5] w-full items-center justify-center rounded-xl border border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
					>
						<Plus class="h-5 w-5" />
					</div>
					<div class="flex flex-col gap-0.5 px-1">
						<h3 class="truncate text-[13px] font-medium text-foreground">New avatar</h3>
						<p class="truncate text-[12px] text-muted-foreground">From prompt or upload</p>
					</div>
				</a>
				{#each avatars as avatar (avatar.id)}
					<AvatarCard avatar={avatar} voiceLabel={voiceLabel(avatar.voiceId)} />
				{/each}
			</div>
		{/if}
	</div>
</div>
