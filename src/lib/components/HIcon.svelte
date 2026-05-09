<script lang="ts">
	import Icon from '@iconify/svelte';

	type Props = {
		name: string;
		class?: string;
	} & Record<string, unknown>;

	let { name, class: className = '', ...rest }: Props = $props();
</script>

<Icon icon={`hugeicons:${name}`} class={className} {...rest} />
