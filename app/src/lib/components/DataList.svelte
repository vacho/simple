<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLUListElement> {
		children?: Snippet;
	}

	let { children, ...rest }: Props = $props();
</script>

<ul {...rest}>
	{@render children?.()}
</ul>

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface-raised);
	}

	ul :global(li + li) {
		border-block-start: 1px solid var(--color-border);
	}
</style>
