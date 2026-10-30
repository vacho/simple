<script lang="ts">
	import { Field as ArkField } from '@ark-ui/svelte/field';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label: string;
		name: string;
		/** Translated hint and error shown next to the input. */
		hint?: string;
		error?: string;
	}

	let { label, name, hint, error, ...input }: Props = $props();
</script>

<div class="field-wrapper">
	<ArkField.Root invalid={!!error} required={!!input.required} disabled={!!input.disabled}>
		<ArkField.Label>{label}</ArkField.Label>
		<ArkField.Input {name} {...input} />
		{#if hint}<ArkField.HelperText>{hint}</ArkField.HelperText>{/if}
		{#if error}<ArkField.ErrorText>{error}</ArkField.ErrorText>{/if}
	</ArkField.Root>
</div>

<style>
	.field-wrapper :global([data-scope='field'][data-part='root']) {
		display: grid;
		gap: var(--space-1);
	}

	.field-wrapper :global([data-part='label']) {
		font-weight: var(--weight-strong);
	}

	.field-wrapper :global([data-part='input']) {
		inline-size: 100%;
		min-block-size: 2.75rem;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-text);
		font: inherit;
	}

	.field-wrapper :global([data-part='helper-text']) {
		color: var(--color-text-muted);
	}

	.field-wrapper :global([data-part='error-text']) {
		color: var(--color-danger);
	}
</style>
