<script lang="ts">
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import AccountActions from '../../AccountActions.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { baseClassLabel } from '#lib/features/household/base-classes.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const here = $derived(resolve(`members/${data.member.id}`));

	// Member form errors only: the account forms show their own.
	const memberForm = $derived(
		form?.values?.form === 'account' || form?.values?.form === 'create-account' ? null : form
	);
	const accountForm = $derived(form?.values?.form === 'create-account' ? form : null);
	const typeError = $derived(fieldError(i18n.t, memberForm, 'memberTypeId'));
	const roleLabel = { admin: 'users.role.admin', member: 'users.role.member' } as const;
</script>

<svelte:head>
	<title>{i18n.t('household.member.title', { name: data.member.name })}</title>
</svelte:head>

<p><a href={resolve('members')}>{i18n.t('household.member.back')}</a></p>
<h1>{i18n.t('household.member.title', { name: data.member.name })}</h1>

{#if data.member.archivedAt}
	<p role="status">{i18n.t('household.member.archived')}</p>
{/if}

{#if data.done && !form}
	<p role="status">{i18n.t('users.accounts.done')}</p>
{/if}

{#if formError(i18n.t, memberForm)}
	<p class="error" role="alert">{formError(i18n.t, memberForm)}</p>
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
		defaultValue={memberForm?.values?.name ?? data.member.name}
		error={fieldError(i18n.t, memberForm, 'name')}
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
				<option
					value={type.id}
					selected={(memberForm?.values?.memberTypeId || data.member.memberTypeId) === type.id}
				>
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

<section class="account-section">
	<h2>{i18n.t('users.account.section')}</h2>
	{#if data.member.account}
		<AccountActions
			account={data.member.account}
			own={data.member.account.userId === data.ownId}
			confirm={data.accountConfirm}
			{form}
		/>
		<form method="POST" action="?/unlinkAccount">
			<button type="submit">{i18n.t('users.account.unlink')}</button>
		</form>
	{:else}
		<p>{i18n.t('users.account.none')}</p>

		<h3>{i18n.t('users.account.create_heading')}</h3>
		<p>{i18n.t('users.account.create_hint')}</p>
		<form method="POST" action="?/createAccount" class="stack">
			{#if formError(i18n.t, accountForm)}
				<p class="error" role="alert">{formError(i18n.t, accountForm)}</p>
			{/if}
			<Field
				label={i18n.t('users.field.display_name')}
				name="displayName"
				defaultValue={accountForm?.values?.displayName ?? data.member.name}
				error={fieldError(i18n.t, accountForm, 'displayName')}
				required
			/>
			<Field
				label={i18n.t('users.field.username')}
				name="username"
				autocomplete="off"
				defaultValue={accountForm?.values?.username ?? ''}
				error={fieldError(i18n.t, accountForm, 'username')}
				required
			/>
			<div class="field">
				<label for="new-role">{i18n.t('users.field.role')}</label>
				<select id="new-role" name="role">
					{#each ['member', 'admin'] as const as role (role)}
						<option value={role} selected={(accountForm?.values?.role ?? 'member') === role}>
							{i18n.t(roleLabel[role])}
						</option>
					{/each}
				</select>
			</div>
			<Field
				label={i18n.t('users.field.temporary_password')}
				name="password"
				type="text"
				autocomplete="off"
				error={fieldError(i18n.t, accountForm, 'password')}
				required
			/>
			<button type="submit">{i18n.t('users.account.create')}</button>
		</form>

		{#if data.unlinked.length > 0}
			<h3>{i18n.t('users.account.link_heading')}</h3>
			<form method="POST" action="?/linkAccount" class="row">
				<label for="link-account">{i18n.t('users.account.link_field')}</label>
				<select id="link-account" name="userId">
					{#each data.unlinked as account (account.userId)}
						<option value={account.userId}>{account.username} ({account.displayName})</option>
					{/each}
				</select>
				<button type="submit">{i18n.t('users.account.link')}</button>
			</form>
		{/if}
	{/if}
</section>

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

	.actions,
	.account-section {
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
