<script lang="ts">
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import DataList from '#lib/components/DataList.svelte';
	import DataListRow from '#lib/components/DataListRow.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { baseClassLabel } from '#lib/features/household/base-classes.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const active = $derived(data.list.members.filter((member) => member.archivedAt === null));
	const archived = $derived(data.list.members.filter((member) => member.archivedAt !== null));
	const accountOf = (member: (typeof data.list.members)[number]) =>
		'account' in member ? member.account : undefined;
	const typeError = $derived(fieldError(i18n.t, form, 'memberTypeId'));
</script>

<svelte:head>
	<title>{i18n.t('household.members.title')}</title>
</svelte:head>

<PageHeader
	title={i18n.t('household.members.title')}
	subtitle={data.household.name ?? i18n.t('household.unnamed')}
/>

{#snippet list(members: typeof data.list.members)}
	<DataList>
		{#each members as member (member.id)}
			{@const account = accountOf(member)}
			<DataListRow
				title={member.name}
				muted={member.archivedAt !== null}
				meta={i18n.t('household.members.type_and_class', {
					type: member.typeName,
					baseClass: i18n.t(baseClassLabel[member.baseClass])
				})}
			>
				{#snippet titleLink()}
					{#if data.list.withAccounts}<a href={resolve(`members/${member.id}`)}>{member.name}</a
						>{:else}<strong>{member.name}</strong>{/if}
				{/snippet}
				{#snippet trailing()}
					{#if member.archivedAt !== null}<Badge
							tone="muted"
							label={i18n.t('household.member.archived')}
						/>{/if}
					{#if data.list.withAccounts}
						<Badge
							label={account?.username
								? i18n.t('household.members.account', { username: account.username })
								: i18n.t('household.members.no_account')}
						/>
						{#if account?.role === 'admin'}<Badge
								tone="info"
								label={i18n.t('users.role.admin')}
							/>{/if}
						{#if account && !account.active}<Badge
								tone="warning"
								label={i18n.t('users.account.state_inactive')}
							/>{/if}
						{#if account?.passwordTemporary}<Badge
								tone="warning"
								label={i18n.t('users.account.state_temporary')}
							/>{/if}
					{/if}
				{/snippet}
			</DataListRow>
		{/each}
	</DataList>
{/snippet}

{#if active.length === 0}
	<EmptyState
		title={i18n.t('household.members.title')}
		description={i18n.t('household.members.empty')}
	>
		{#snippet action()}{#if data.manage}<a href="#new-member"
					>{i18n.t('household.members.create')}</a
				>{/if}{/snippet}
	</EmptyState>
{:else}
	{@render list(active)}
{/if}

{#if data.types.length > 0}
	<h2>{i18n.t('household.member_types.title')}</h2>
	<ul class="types">
		{#each data.types as type (type.id)}
			<li>
				{i18n.t('household.members.type_and_class', {
					type: type.name,
					baseClass: i18n.t(baseClassLabel[type.baseClass])
				})}
			</li>
		{/each}
	</ul>
{/if}

{#if data.manage}
	{#if archived.length > 0}
		<h2>{i18n.t('household.members.archived_heading')}</h2>
		{@render list(archived)}
	{/if}

	<h2 id="new-member">{i18n.t('household.members.new')}</h2>
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
	.types {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		padding: 0;
		list-style: none;
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
