<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		meta?: string;
		titleLink?: Snippet;
		trailing?: Snippet;
		muted?: boolean;
	}

	let { title, meta, titleLink, trailing, muted = false }: Props = $props();
</script>

<li data-muted={muted || undefined}>
	<div class="content">
		{#if titleLink}{@render titleLink()}{:else}<strong>{title}</strong>{/if}
		{#if meta}<span>{meta}</span>{/if}
	</div>
	{#if trailing}<div class="trailing">{@render trailing()}</div>{/if}
</li>

<style>
	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-3);
	}

	li[data-muted] {
		background: var(--color-surface);
	}

	.content {
		display: grid;
		gap: var(--space-1);
	}

	span {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.trailing {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
</style>
