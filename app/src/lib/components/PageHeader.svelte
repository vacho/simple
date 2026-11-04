<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		action?: Snippet;
	}

	let { title, subtitle, action }: Props = $props();
</script>

<header>
	<div>
		<h1>{title}</h1>
		{#if subtitle}<p>{subtitle}</p>{/if}
	</div>
	{#if action}<div class="action">{@render action()}</div>{/if}
</header>

<style>
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		justify-content: space-between;
		gap: var(--space-3);
		margin-block-end: var(--space-4);
	}

	h1 {
		margin: 0;
		font-size: var(--text-2xl);
		line-height: 1.25;
	}

	p {
		margin-block: var(--space-1) 0;
		color: var(--color-text-muted);
	}

	.action {
		flex-shrink: 0;
	}
</style>
