<script lang="ts">
	import type { Avatar } from '$lib/types';

	interface Props {
		avatar: Avatar;
		voiceLabel?: string;
	}
	let { avatar, voiceLabel }: Props = $props();
</script>

<a
	href={`/avatars/${avatar.id}`}
	class="group flex flex-col gap-2 transition-opacity hover:opacity-95"
>
	<div
		class="aspect-[4/5] w-full overflow-hidden rounded-xl bg-card ring-1 ring-border transition-all group-hover:ring-border-strong"
	>
		{#if avatar.referenceImageBase64}
			<img
				src={avatar.referenceImageBase64}
				alt={avatar.name}
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
			/>
		{/if}
	</div>
	<div class="flex flex-col gap-0.5 px-1">
		<h3 class="truncate text-[13px] font-medium text-foreground">{avatar.name}</h3>
		<p class="truncate text-[12px] text-muted-foreground">
			{voiceLabel ?? 'No voice'}
		</p>
	</div>
</a>
