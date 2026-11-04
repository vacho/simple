<script lang="ts">
	import { Dialog as ArkDialog } from '@ark-ui/svelte/dialog';
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import './dialog.css';

	interface Props {
		triggerLabel: string;
		title: string;
		description: string;
		cancelLabel: string;
		actionLabel?: string;
		action?: Snippet<[() => void]>;
		onConfirm?: () => void;
	}

	let { triggerLabel, title, description, cancelLabel, actionLabel, action, onConfirm }: Props =
		$props();
	let cancelButton = $state<HTMLButtonElement | null>(null);
	let open = $state(false);
	const close = () => (open = false);
</script>

<ArkDialog.Root
	role="alertdialog"
	closeOnInteractOutside={false}
	lazyMount
	unmountOnExit
	initialFocusEl={() => cancelButton}
	bind:open
>
	<ArkDialog.Trigger class="ui-dialog-trigger">{triggerLabel}</ArkDialog.Trigger>
	<ArkDialog.Backdrop class="ui-dialog-backdrop" />
	<ArkDialog.Positioner class="ui-dialog-positioner">
		<ArkDialog.Content class="ui-dialog-content">
			<ArkDialog.Title>{title}</ArkDialog.Title>
			<ArkDialog.Description>{description}</ArkDialog.Description>
			<div class="ui-dialog-actions">
				<ArkDialog.CloseTrigger class="ui-dialog-cancel" bind:ref={cancelButton}
					>{cancelLabel}</ArkDialog.CloseTrigger
				>
				{#if action}{@render action(close)}{:else if actionLabel}<Button
						variant="danger"
						onclick={() => {
							onConfirm?.();
							close();
						}}>{actionLabel}</Button
					>{/if}
			</div>
		</ArkDialog.Content>
	</ArkDialog.Positioner>
</ArkDialog.Root>
