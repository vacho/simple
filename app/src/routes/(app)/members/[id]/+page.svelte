<script lang="ts">
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const baseClassLabel = {
		adult: 'household.base_class.adult',
		minor: 'household.base_class.minor',
		dependent: 'household.base_class.dependent'
	} as const;
	const here = $derived(resolve(`members/${data.member.id}`));
	const selectedType = $derived(form?.values?.memberTypeId || data.member.memberTypeId);
	const typeError = $derived(fieldError(i18n.t, form, 'memberTypeId'));
</script>

<svelte:head>
	<title>{i18n.t('household.member.title', { name: data.member.name })}</title>
</svelte:head>

<p><a href={resolve('members')}>{i18n.t('household.member.back')}</a></p>
<h1>{i18n.t('household.member.title', { name: data.member.name })}</h1>

{#if data.member.archivedAt}
	<p role="status">{i18n.t('household.member.archived')}</p>
{/if}

{#if formError(i18n.t, form)}
	<p class="error" role="alert">{formError(i18n.t, form)}</p>
{/if}

{#if data.confirm}
	<section class="confirm" aria-live="polite">
		<p>
			{data.confirm === 'archive'
				? i18n.t('household.confirm.archive_member', { name: data.member.name })
				: i18n.t('household.confirm.delete_member', { name: data.member.name })}
		</p>
		<form method="POST" action="?/{data.confirm}" class="row">
			<button type="submit">
				{i18n.t(
					data.confirm === 'archive' ? 'household.action.archive' : 'household.action.delete'
				)}
			</button>
			<a href={here}>{i18n.t('household.action.cancel')}</a>
		</form>
	</section>
{/if}

<form method="POST" action="?/update" class="stack">
	<Field
		label={i18n.t('household.field.name')}
		name="name"
		defaultValue={form?.values?.name ?? data.member.name}
		error={fieldError(i18n.t, form, 'name')}
		required
	/>
	<div class="field">
		<label for="member-type">{i18n.t('household.field.member_type')}</label>
		<select
			id="member-type"
			name="memberTypeId"
			aria-invalid={typeError ? 'true' : undefined}
			aria-describedby={typeError ? 'member-type-error' : undefined}
		>
			{#each data.types as type (type.id)}
				<option value={type.id} selected={selectedType === type.id}>
					{i18n.t('household.members.type_and_class', {
						type: type.name,
						baseClass: i18n.t(baseClassLabel[type.baseClass])
					})}
				</option>
			{/each}
		</select>
		{#if typeError}<p id="member-type-error" class="error">{typeError}</p>{/if}
	</div>
	<button type="submit">{i18n.t('household.member.save')}</button>
</form>

<div class="row actions">
	{#if data.member.archivedAt}
		<form method="POST" action="?/unarchive">
			<button type="submit">{i18n.t('household.action.unarchive')}</button>
		</form>
	{:else}
		<a href="{here}?confirm=archive">{i18n.t('household.action.archive')}</a>
	{/if}
	{#if !data.member.firstLinkedAt}
		<a href="{here}?confirm=delete">{i18n.t('household.action.delete')}</a>
	{/if}
</div>

<style>
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

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.actions {
		margin-block-start: var(--space-4);
	}

	.confirm {
		padding: var(--space-3);
		margin-block-end: var(--space-3);
		border: 1px solid var(--color-border);
	}

	.error {
		margin: 0;
	}
</style>
