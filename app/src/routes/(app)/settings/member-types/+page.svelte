<script lang="ts">
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Form from '#lib/components/Form.svelte';
	import Field from '#lib/components/Field.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Card from '#lib/components/Card.svelte';
	import DataList from '#lib/components/DataList.svelte';
	import DataListRow from '#lib/components/DataListRow.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Select from '#lib/components/Select.svelte';

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

<PageHeader
	title={i18n.t('household.member_types.title')}
	subtitle={i18n.t('household.member_types.intro')}
/>

{#if data.types.length === 0}
	<EmptyState
		title={i18n.t('household.member_types.title')}
		description={i18n.t('household.member_types.empty')}
		>{#snippet action()}<a href="#new-type">{i18n.t('household.member_types.create')}</a
			>{/snippet}</EmptyState
	>
{:else}
	<DataList>
		{#each data.types as type (type.id)}
			{@const failed = failedId === type.id ? form : null}
			<DataListRow title={type.name} muted={type.archived}>
				<Form
					action="?/update"
					success="household.changes.saved"
					submitLabel={i18n.t('household.member_types.save')}
				>
					<input type="hidden" name="id" value={type.id} />
					<Field
						label={i18n.t('household.field.name')}
						name="name"
						defaultValue={failed?.values?.name ?? type.name}
						error={fieldError(i18n.t, failed, 'name')}
						required
					/>
					<Select
						name="baseClass"
						label={i18n.t('household.field.base_class')}
						value={type.baseClass}
						disabled={type.inUse}
						hint={type.inUse ? i18n.t('household.member_types.base_class_locked') : undefined}
						options={baseClasses.map((base) => ({
							value: base,
							label: i18n.t(baseClassLabel[base])
						}))}
					/>
				</Form>
				<p class="meta">
					{i18n.t('household.member_types.member_count', { count: type.activeMembers })}
					{#if type.archived}<Badge
							tone="muted"
							label={i18n.t('household.member_types.archived')}
						/>{/if}
				</p>
				{#if failed && formError(i18n.t, failed)}
					<p class="error" role="alert">{formError(i18n.t, failed)}</p>
				{/if}
				<div class="row">
					{#if type.archived}
						<Form
							action="?/unarchive"
							success="household.changes.saved"
							submitLabel={i18n.t('household.action.unarchive')}
						>
							<input type="hidden" name="id" value={type.id} />
						</Form>
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
			</DataListRow>
		{/each}
	</DataList>
{/if}

<div id="new-type">
	<Card
		><h2>{i18n.t('household.member_types.new')}</h2>
		<Form
			action="?/create"
			success="household.changes.saved"
			submitLabel={i18n.t('household.member_types.create')}
		>
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
			<Select
				name="baseClass"
				label={i18n.t('household.field.base_class')}
				value={(isNew && form?.values?.baseClass) || baseClasses[0]}
				options={baseClasses.map((base) => ({ value: base, label: i18n.t(baseClassLabel[base]) }))}
			/>
		</Form></Card
	>
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	#new-type {
		margin-block-start: var(--space-4);
		max-inline-size: 32rem;
	}
	.meta,
	.error {
		margin: 0;
	}
</style>
