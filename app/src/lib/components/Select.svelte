<script lang="ts">
	import { Field as ArkField } from '@ark-ui/svelte/field';
	import { Select as ArkSelect, createListCollection } from '@ark-ui/svelte/select';

	interface Option {
		label: string;
		value: string;
		disabled?: boolean;
	}

	interface Props {
		label: string;
		name: string;
		options: Option[];
		value?: string;
		hint?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
	}

	let {
		label,
		name,
		options,
		value,
		hint,
		error,
		required = false,
		disabled = false
	}: Props = $props();
	let collection = $derived(createListCollection({ items: options }));
</script>

<div class="select-wrapper">
	<ArkField.Root invalid={!!error} {required} {disabled}>
		<ArkField.Label>{label}</ArkField.Label>
		<ArkSelect.Root {collection} {name} defaultValue={value ? [value] : []} {disabled}>
			<ArkSelect.Control>
				<ArkSelect.Trigger>
					<ArkSelect.ValueText placeholder={label} />
					<ArkSelect.Indicator>⌄</ArkSelect.Indicator>
				</ArkSelect.Trigger>
			</ArkSelect.Control>
			<ArkSelect.Positioner>
				<ArkSelect.Content>
					{#each options as option (option.value)}
						<ArkSelect.Item item={option}>
							<ArkSelect.ItemText>{option.label}</ArkSelect.ItemText>
						</ArkSelect.Item>
					{/each}
				</ArkSelect.Content>
			</ArkSelect.Positioner>
			<ArkSelect.HiddenSelect />
		</ArkSelect.Root>
		{#if hint}<ArkField.HelperText>{hint}</ArkField.HelperText>{/if}
		{#if error}<ArkField.ErrorText>{error}</ArkField.ErrorText>{/if}
	</ArkField.Root>
</div>

<style>
	.select-wrapper :global([data-scope='field'][data-part='root']) {
		display: grid;
		gap: var(--space-1);
	}

	.select-wrapper :global([data-part='label']) {
		font-weight: var(--weight-strong);
	}

	.select-wrapper :global([data-scope='select'][data-part='trigger']) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		inline-size: 100%;
		min-block-size: 2.75rem;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-text);
	}

	.select-wrapper :global([data-scope='select'][data-part='content']) {
		max-block-size: 16rem;
		overflow: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		box-shadow: var(--shadow-raised);
	}

	.select-wrapper :global([data-scope='select'][data-part='item']) {
		padding: var(--space-2) var(--space-3);
		color: var(--color-text);
	}

	.select-wrapper :global([data-scope='select'][data-part='item'][data-highlighted]) {
		background: var(--color-primary-soft);
	}

	.select-wrapper :global([data-part='error-text']) {
		color: var(--color-danger);
	}

	.select-wrapper :global([data-part='helper-text']) {
		color: var(--color-text-muted);
	}
</style>
