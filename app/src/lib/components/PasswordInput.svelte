<script lang="ts">
	import { Field as ArkField } from '@ark-ui/svelte/field';
	import { PasswordInput as ArkPasswordInput } from '@ark-ui/svelte/password-input';
	import Icon from './Icon.svelte';
	import { getI18n } from '#lib/i18n/t.ts';

	interface Props {
		label: string;
		name: string;
		hint?: string;
		error?: string;
		value?: string;
		autoComplete?: 'current-password' | 'new-password';
		required?: boolean;
	}

	let {
		label,
		name,
		hint,
		error,
		value,
		autoComplete = 'current-password',
		required = false
	}: Props = $props();
	const i18n = getI18n();
</script>

<div class="password-wrapper">
	<ArkField.Root invalid={!!error} {required}>
		<ArkPasswordInput.Root
			{name}
			{autoComplete}
			{required}
			translations={{
				visibilityTrigger: (visible) =>
					visible ? i18n.t('auth.password.hide') : i18n.t('auth.password.show')
			}}
		>
			<ArkPasswordInput.Label>{label}</ArkPasswordInput.Label>
			<ArkPasswordInput.Control>
				<ArkPasswordInput.Input {value} />
				<ArkPasswordInput.VisibilityTrigger type="button">
					<ArkPasswordInput.Indicator>
						{#snippet fallback()}<Icon name="eye" />{/snippet}
						<Icon name="eye-off" />
					</ArkPasswordInput.Indicator>
				</ArkPasswordInput.VisibilityTrigger>
			</ArkPasswordInput.Control>
		</ArkPasswordInput.Root>
		{#if hint}<ArkField.HelperText>{hint}</ArkField.HelperText>{/if}
		{#if error}<ArkField.ErrorText>{error}</ArkField.ErrorText>{/if}
	</ArkField.Root>
</div>

<style>
	.password-wrapper :global([data-scope='field'][data-part='root']) {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-1);
	}

	.password-wrapper :global([data-part='label']) {
		font-weight: var(--weight-strong);
	}

	.password-wrapper :global([data-scope='password-input'][data-part='control']) {
		display: flex;
		align-items: center;
	}

	.password-wrapper :global([data-scope='password-input'][data-part='input']) {
		flex: 1;
		min-inline-size: 0;
		min-block-size: 2.75rem;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-text);
		font: inherit;
	}

	.password-wrapper :global([data-scope='password-input'][data-part='visibility-trigger']) {
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		color: var(--color-primary);
	}

	.password-wrapper :global([data-part='error-text']) {
		color: var(--color-danger);
	}

	.password-wrapper :global([data-part='helper-text']) {
		color: var(--color-text-muted);
	}
</style>
