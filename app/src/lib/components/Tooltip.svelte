<script lang="ts">
	import { Tooltip as ArkTooltip } from '@ark-ui/svelte/tooltip';

	interface Props {
		label: string;
		content: string;
	}

	let { label, content }: Props = $props();
</script>

<div class="tooltip-wrapper">
	<ArkTooltip.Root>
		<ArkTooltip.Trigger>{label}</ArkTooltip.Trigger>
		<ArkTooltip.Positioner>
			<ArkTooltip.Content>{content}</ArkTooltip.Content>
		</ArkTooltip.Positioner>
	</ArkTooltip.Root>
</div>

<style>
	.tooltip-wrapper :global([data-scope='tooltip'][data-part='trigger']) {
		min-block-size: 2.75rem;
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-text);
		font: inherit;
	}

	.tooltip-wrapper :global([data-scope='tooltip'][data-part='content']) {
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-text);
		box-shadow: var(--shadow-raised);
	}
</style>
