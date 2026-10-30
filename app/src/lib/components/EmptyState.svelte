<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		icon?: Snippet;
		action?: Snippet;
	}

	let { title, description, icon, action }: Props = $props();
</script>

<div class="empty-state">
	{#if icon}<div class="icon">{@render icon()}</div>{/if}
	<h2>{title}</h2>
	<p>{description}</p>
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.empty-state {
		display: grid;
		justify-items: center;
		gap: var(--space-2);
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		background: var(--color-surface-raised);
		text-align: center;
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		font-size: var(--text-lg);
	}

	p,
	.icon {
		color: var(--color-text-muted);
	}

	.action {
		margin-block-start: var(--space-2);
	}
</style>
