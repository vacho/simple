<script lang="ts">
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Form from '#lib/components/Form.svelte';
	import Field from '#lib/components/Field.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { baseClassLabel, baseClasses } from '#lib/features/household/base-classes.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	// Errors belong to the form that was submitted: the new type, or one row of the list.
	const isNew = $derived(form?.values?.form === 'create');
	const failedId = $derived(isNew ? undefined : form?.values?.id);
</script>

<svelte:head>
	<title>{i18n.t('household.member_types.title')}</title>
</svelte:head>

<h1>{i18n.t('household.member_types.title')}</h1>
<p>{i18n.t('household.member_types.intro')}</p>

{#if data.types.length === 0}
	<p>{i18n.t('household.member_types.empty')}</p>
{:else}
	<ul class="types">
		{#each data.types as type (type.id)}
			{@const failed = failedId === type.id ? form : null}
			<li class="type">
				<form method="POST" action="?/update" class="row">
					<input type="hidden" name="id" value={type.id} />
					<Field
						label={i18n.t('household.field.name')}
						name="name"
						defaultValue={failed?.values?.name ?? type.name}
						error={fieldError(i18n.t, failed, 'name')}
						required
					/>
					<div class="field">
						<label for="base-{type.id}">{i18n.t('household.field.base_class')}</label>
						<select
							id="base-{type.id}"
							name="baseClass"
							disabled={type.inUse}
							aria-describedby={type.inUse ? `locked-${type.id}` : undefined}
						>
							{#each baseClasses as base (base)}
								<option value={base} selected={type.baseClass === base}>
									{i18n.t(baseClassLabel[base])}
								</option>
							{/each}
						</select>
						{#if type.inUse}
							<p id="locked-{type.id}" class="note">
								{i18n.t('household.member_types.base_class_locked')}
							</p>
						{/if}
					</div>
					<button type="submit">{i18n.t('household.member_types.save')}</button>
				</form>
				<p class="meta">
					{i18n.t('household.member_types.member_count', { count: type.activeMembers })}
					{#if type.archived}<strong>{i18n.t('household.member_types.archived')}</strong>{/if}
				</p>
				{#if failed && formError(i18n.t, failed)}
					<p class="error" role="alert">{formError(i18n.t, failed)}</p>
				{/if}
				<div class="row">
					{#if type.archived}
						<form method="POST" action="?/unarchive">
							<input type="hidden" name="id" value={type.id} />
							<button type="submit">{i18n.t('household.action.unarchive')}</button>
						</form>
					{:else}
						<ConfirmDialog
							triggerLabel={i18n.t('household.action.archive')}
							title={i18n.t('household.dialog.archive_type.title', { name: type.name })}
							description={i18n.t('household.confirm.archive_type', { name: type.name })}
							cancelLabel={i18n.t('household.action.cancel')}
						>
							{#snippet action(close)}
								<Form
									action="?/archive"
									success="household.changes.saved"
									submitLabel={i18n.t('household.action.archive')}
									variant="danger"
									onResult={close}
								>
									<input type="hidden" name="id" value={type.id} />
								</Form>
							{/snippet}
						</ConfirmDialog>
					{/if}
					{#if !type.inUse}
						<ConfirmDialog
							triggerLabel={i18n.t('household.action.delete')}
							title={i18n.t('household.dialog.delete_type.title', { name: type.name })}
							description={i18n.t('household.confirm.delete_type', { name: type.name })}
							cancelLabel={i18n.t('household.action.cancel')}
						>
							{#snippet action(close)}
								<Form
									action="?/delete"
									success="household.changes.saved"
									submitLabel={i18n.t('household.action.delete')}
									variant="danger"
									onResult={close}
								>
									<input type="hidden" name="id" value={type.id} />
								</Form>
							{/snippet}
						</ConfirmDialog>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<h2>{i18n.t('household.member_types.new')}</h2>
<form method="POST" action="?/create" class="stack">
	{#if isNew && formError(i18n.t, form)}
		<p class="error" role="alert">{formError(i18n.t, form)}</p>
	{/if}
	<input type="hidden" name="id" value={(isNew && form?.values?.id) || data.newId} />
	<Field
		label={i18n.t('household.field.name')}
		name="name"
		defaultValue={isNew ? (form?.values?.name ?? '') : ''}
		error={isNew ? fieldError(i18n.t, form, 'name') : undefined}
		required
	/>
	<div class="field">
		<label for="new-base">{i18n.t('household.field.base_class')}</label>
		<select id="new-base" name="baseClass">
			{#each baseClasses as base (base)}
				<option value={base} selected={isNew && form?.values?.baseClass === base}>
					{i18n.t(baseClassLabel[base])}
				</option>
			{/each}
		</select>
	</div>
	<button type="submit">{i18n.t('household.member_types.create')}</button>
</form>

<style>
	.types {
		display: grid;
		gap: var(--space-3);
		padding: 0;
		list-style: none;
	}

	.type {
		display: grid;
		gap: var(--space-2);
		padding-block-end: var(--space-3);
		border-block-end: 1px solid var(--color-border);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: end;
	}

	.stack {
		display: grid;
		gap: var(--space-3);
		max-inline-size: 28rem;
	}

	.field {
		display: grid;
		gap: var(--space-1);
	}

	label {
		font-weight: 600;
	}

	.note,
	.meta,
	.error {
		margin: 0;
	}
</style>
