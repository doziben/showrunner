<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		value: string;
		placeholder?: string;
		rows?: number;
		onChange: (v: string) => void;
		class?: string;
	}

	let { value, placeholder, rows = 18, onChange, class: className }: Props = $props();

	let textareaEl: HTMLTextAreaElement | null = $state(null);
	let preEl: HTMLPreElement | null = $state(null);

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/**
	 * Wrap any [bracketed tags] in styled spans. ElevenLabs v3 reads the brackets
	 * as audio tags so we surface them visually the same way ElevenLabs's own UI
	 * does — slight pill background + accent text.
	 */
	const highlighted = $derived.by(() => {
		const escaped = escapeHtml(value || '');
		const withTags = escaped.replace(
			/\[([^\]\n]+?)\]/g,
			(_match, inner) =>
				`<span class="rounded-[3px] bg-foreground/15 px-1 text-foreground">[${inner}]</span>`
		);
		// Trailing newline + space ensures the last (possibly empty) line lays out
		// correctly; without it the cursor floats above the painted text.
		return withTags + '\n ';
	});

	function syncScroll() {
		if (!textareaEl || !preEl) return;
		preEl.scrollTop = textareaEl.scrollTop;
		preEl.scrollLeft = textareaEl.scrollLeft;
	}

	function handleInput(e: Event) {
		onChange((e.target as HTMLTextAreaElement).value);
	}
</script>

<div class={cn('relative', className)}>
	<textarea
		bind:this={textareaEl}
		{value}
		{placeholder}
		{rows}
		oninput={handleInput}
		onscroll={syncScroll}
		spellcheck={false}
		autocomplete="off"
		autocapitalize="off"
		class="script-textarea block w-full resize-y rounded-lg border border-border bg-input/60 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-transparent caret-foreground outline-none transition-colors selection:bg-foreground/25 focus:border-border-strong focus:bg-input"
	></textarea>
	<pre
		bind:this={preEl}
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-transparent px-3 py-2.5 font-mono text-[12px] leading-relaxed text-muted-foreground"
	>{@html highlighted}</pre>
</div>

<style>
	/* Render textarea text invisibly without affecting the caret or the placeholder. */
	.script-textarea {
		-webkit-text-fill-color: transparent;
	}
	.script-textarea::placeholder {
		-webkit-text-fill-color: hsl(var(--muted-foreground) / 0.7);
		color: hsl(var(--muted-foreground) / 0.7);
	}
</style>
