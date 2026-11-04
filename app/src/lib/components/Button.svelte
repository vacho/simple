<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md';
		busy?: boolean;
		children?: Snippet;
	}

	let { variant = 'primary', size = 'md', busy = false, children, ...rest }: Props = $props();
</script>

<button
	{...rest}
	data-variant={variant}
	data-size={size}
	disabled={busy || rest.disabled}
	aria-busy={busy}
>
	{@render children?.()}
</button>

<style>
	button {
		font: inherit;
		font-weight: var(--weight-strong);
		min-block-size: 2.75rem;
		padding-block: var(--space-2);
		padding-inline: var(--space-3);
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-control);
		background: var(--color-primary);
		color: var(--color-on-primary);
		cursor: pointer;
	}

	button[data-size='sm'] {
		padding-inline: var(--space-2);
	}

	button[data-variant='secondary'] {
		background: var(--color-surface-raised);
		color: var(--color-primary);
	}

	button[data-variant='ghost'] {
		border-color: var(--color-transparent);
		background: var(--color-transparent);
		color: var(--color-primary);
	}

	button[data-variant='danger'] {
		border-color: var(--color-danger);
		background: var(--color-danger);
		color: var(--color-on-danger);
	}

	button:disabled {
		cursor: default;
		opacity: 0.6;
	}
</style>
