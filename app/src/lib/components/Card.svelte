<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLElement> {
		children?: Snippet;
	}

	let { children, ...rest }: Props = $props();
</script>

<section {...rest}>
	{@render children?.()}
</section>

<style>
	section {
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface-raised);
		box-shadow: var(--shadow-raised);
	}
</style>
