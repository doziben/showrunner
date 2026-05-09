<script lang="ts">
	interface Props {
		values: number[];
		width?: number;
		height?: number;
		stroke?: string;
		fill?: string;
		class?: string;
	}

	let {
		values,
		width = 80,
		height = 22,
		stroke = 'currentColor',
		fill = 'none',
		class: className
	}: Props = $props();

	const path = $derived.by(() => {
		if (values.length === 0) return '';
		const max = Math.max(...values, 0.001);
		const min = Math.min(...values, 0);
		const range = max - min || 1;
		const stepX = values.length > 1 ? width / (values.length - 1) : 0;
		const points = values.map((v, i) => {
			const x = i * stepX;
			const y = height - ((v - min) / range) * height;
			return [x, y];
		});
		return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
	});

	const areaPath = $derived.by(() => {
		if (!path) return '';
		return `${path} L${width},${height} L0,${height} Z`;
	});
</script>

<svg
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	preserveAspectRatio="none"
	class={className}
	role="img"
	aria-label="trend"
>
	{#if values.length > 0}
		{#if fill !== 'none'}
			<path d={areaPath} fill={fill} stroke="none" />
		{/if}
		<path d={path} fill="none" stroke={stroke} stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
	{/if}
</svg>
