<script lang="ts">
	import { Toast, Toaster as ArkToaster } from '@ark-ui/svelte/toast';
	import { getI18n } from '#lib/i18n/t.ts';
	import { toaster } from './toast.ts';

	const i18n = getI18n();
</script>

<ArkToaster {toaster} label={i18n.t('shell.notifications')} role="status" aria-live="polite">
	{#snippet children(item)}
		<Toast.Root>
			<Toast.Title>{item().title}</Toast.Title>
		</Toast.Root>
	{/snippet}
</ArkToaster>

<style>
	:global([data-scope='toast'][data-part='group']) {
		z-index: 100;
	}

	:global([data-scope='toast'][data-part='root']) {
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-text);
		box-shadow: var(--shadow-raised);
	}
</style>
