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
	const active = $derived(data.list.members.filter((member) => member.archivedAt === null));
	const archived = $derived(data.list.members.filter((member) => member.archivedAt !== null));
	const accountOf = (member: (typeof data.list.members)[number]) =>
		'account' in member ? member.account : undefined;
	const typeError = $derived(fieldError(i18n.t, form, 'memberTypeId'));
</script>

<svelte:head>
	<title>{i18n.t('household.members.title')}</title>
</svelte:head>

<h1>{i18n.t('household.members.title')}</h1>
<p class="household">{data.household.name ?? i18n.t('household.unnamed')}</p>

{#snippet list(members: typeof data.list.members)}
	<ul class="members">
		{#each members as member (member.id)}
			{@const account = accountOf(member)}
			<li>
				{#if data.list.withAccounts}
					<a class="name" href={resolve(`members/${member.id}`)}>{member.name}</a>
				{:else}
					<span class="name">{member.name}</span>
				{/if}
				<span>
					{i18n.t('household.members.type_and_class', {
						type: member.typeName,
						baseClass: i18n.t(baseClassLabel[member.baseClass])
					})}
				</span>
				{#if data.list.withAccounts}
					<span>
						{account?.username
							? i18n.t('household.members.account', { username: account.username })
							: i18n.t('household.members.no_account')}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

{#if active.length === 0}
	<p>{i18n.t('household.members.empty')}</p>
{:else}
	{@render list(active)}
{/if}

{#if data.manage}
	{#if archived.length > 0}
		<h2>{i18n.t('household.members.archived_heading')}</h2>
		{@render list(archived)}
	{/if}

	<h2>{i18n.t('household.members.new')}</h2>
	{#if data.types.length === 0}
		<p>
			{i18n.t('household.members.needs_type')}
			<a href={resolve('settings/member-types')}>{i18n.t('household.members.go_to_types')}</a>
		</p>
	{:else}
		<form method="POST" action="?/create" class="stack">
			{#if formError(i18n.t, form)}
				<p class="error" role="alert">{formError(i18n.t, form)}</p>
			{/if}
			<input type="hidden" name="id" value={form?.values?.id || data.newId} />
			<Field
				label={i18n.t('household.field.name')}
				name="name"
				defaultValue={form?.values?.name ?? ''}
				error={fieldError(i18n.t, form, 'name')}
				required
			/>
			<div class="field">
				<label for="new-type">{i18n.t('household.field.member_type')}</label>
				<select
					id="new-type"
					name="memberTypeId"
					aria-invalid={typeError ? 'true' : undefined}
					aria-describedby={typeError ? 'new-type-error' : undefined}
				>
					{#each data.types as type (type.id)}
						<option value={type.id} selected={form?.values?.memberTypeId === type.id}>
							{i18n.t('household.members.type_and_class', {
								type: type.name,
								baseClass: i18n.t(baseClassLabel[type.baseClass])
							})}
						</option>
					{/each}
				</select>
				{#if typeError}<p id="new-type-error" class="error">{typeError}</p>{/if}
			</div>
			<button type="submit">{i18n.t('household.members.create')}</button>
		</form>
	{/if}
{/if}

<style>
	.household {
		font-size: 1.25rem;
	}

	.members {
		display: grid;
		gap: var(--space-2);
		padding: 0;
		list-style: none;
	}

	.members li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		padding-block: var(--space-2);
		border-block-end: 1px solid var(--color-border);
	}

	.name {
		font-weight: 600;
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

	.error {
		margin: 0;
	}
</style>
