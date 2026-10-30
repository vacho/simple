<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
		label?: string;
		children?: Snippet;
	}

	let { tone = 'neutral', label, children, ...rest }: Props = $props();
</script>

<span data-tone={tone} {...rest}>{label}{@render children?.()}</span>

<style>
	span {
		display: inline-flex;
		align-items: center;
		min-block-size: 1.5rem;
		padding-block: var(--space-1);
		padding-inline: var(--space-2);
		border-radius: var(--radius-control);
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: var(--weight-strong);
	}

	span[data-tone='success'] {
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	span[data-tone='warning'] {
		background: var(--color-warning-soft);
		color: var(--color-warning);
	}

	span[data-tone='danger'] {
		background: var(--color-danger-soft);
		color: var(--color-danger);
	}

	span[data-tone='info'] {
		background: var(--color-info-soft);
		color: var(--color-info);
	}

	span[data-tone='muted'] {
		background: var(--color-bg);
	}
</style>
