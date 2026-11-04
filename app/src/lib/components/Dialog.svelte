<script lang="ts">
	import { Dialog as ArkDialog } from '@ark-ui/svelte/dialog';
	import type { Snippet } from 'svelte';
	import './dialog.css';

	interface Props {
		triggerLabel: string;
		title: string;
		description: string;
		closeLabel: string;
		children?: Snippet;
	}

	let { triggerLabel, title, description, closeLabel, children }: Props = $props();
</script>

<ArkDialog.Root>
	<ArkDialog.Trigger class="ui-dialog-trigger">{triggerLabel}</ArkDialog.Trigger>
	<ArkDialog.Backdrop class="ui-dialog-backdrop" />
	<ArkDialog.Positioner class="ui-dialog-positioner">
		<ArkDialog.Content class="ui-dialog-content">
			<ArkDialog.Title>{title}</ArkDialog.Title>
			<ArkDialog.Description>{description}</ArkDialog.Description>
			{@render children?.()}
			<div class="ui-dialog-actions">
				<ArkDialog.CloseTrigger class="ui-dialog-cancel">{closeLabel}</ArkDialog.CloseTrigger>
			</div>
		</ArkDialog.Content>
	</ArkDialog.Positioner>
</ArkDialog.Root>
