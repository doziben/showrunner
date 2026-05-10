<script lang="ts">
	/**
	 * Vercel/nprogress-style top loader.
	 * Fakes asymptotic progress toward 85% while `active`, jumps to 100% and
	 * fades out when deactivated.
	 */
	interface Props {
		active: boolean;
	}
	let { active }: Props = $props();

	let progress = $state(0);
	let visible = $state(false);

	$effect(() => {
		let intervalId: ReturnType<typeof setInterval> | undefined;
		let finishTimeoutId: ReturnType<typeof setTimeout> | undefined;

		if (active) {
			visible = true;
			progress = 8; // jump in immediately so the user sees something
			intervalId = setInterval(() => {
				// Asymptote at 85% so we never look "done" before the real work is.
				progress = progress + (85 - progress) * 0.06;
			}, 220);
		} else if (visible) {
			progress = 100;
			finishTimeoutId = setTimeout(() => {
				visible = false;
				progress = 0;
			}, 450);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
			if (finishTimeoutId) clearTimeout(finishTimeoutId);
		};
	});
</script>

{#if visible}
	<div class="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]">
		<div
			class="h-full rounded-r-full bg-emerald-500 transition-[width] duration-200 ease-out"
			style="width: {progress}%; box-shadow: 0 0 10px hsl(150 70% 50% / 0.65), 0 0 4px hsl(150 70% 50% / 0.8);"
		></div>
	</div>
{/if}
