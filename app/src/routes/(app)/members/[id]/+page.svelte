<script lang="ts">
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import Select from '#lib/components/Select.svelte';

	import Card from '#lib/components/Card.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Form from '#lib/components/Form.svelte';
	import AccountActions from '../../AccountActions.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { baseClassLabel } from '#lib/features/household/base-classes.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();

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
<PageHeader title={i18n.t('household.member.title', { name: data.member.name })} />

{#if data.member.archivedAt}
	<Badge tone="muted" label={i18n.t('household.member.state_archived')} />
{/if}

{#if formError(i18n.t, memberForm)}
	<p class="error" role="alert">{formError(i18n.t, memberForm)}</p>
{/if}

<div class="member-panels">
	<Card
		><Form
			action="?/update"
			success="household.changes.saved"
			submitLabel={i18n.t('household.member.save')}
		>
			<Field
				label={i18n.t('household.field.name')}
				name="name"
				defaultValue={memberForm?.values?.name ?? data.member.name}
				error={fieldError(i18n.t, memberForm, 'name')}
				required
			/>
			<Select
				name="memberTypeId"
				label={i18n.t('household.field.member_type')}
				value={memberForm?.values?.memberTypeId || data.member.memberTypeId}
				error={typeError}
				options={data.types.map((type) => ({
					value: type.id,
					label: i18n.t('household.members.type_and_class', {
						type: type.name,
						baseClass: i18n.t(baseClassLabel[type.baseClass])
					})
				}))}
			/>
		</Form>
	</Card><Card>
		<h2>{i18n.t('users.account.section')}</h2>
		{#if data.member.account}
			<AccountActions
				account={data.member.account}
				own={data.member.account.userId === data.ownId}
				{form}
			/>
			<ConfirmDialog
				triggerLabel={i18n.t('users.account.unlink')}
				title={i18n.t('household.dialog.unlink.title', { name: data.member.name })}
				description={i18n.t('household.confirm.unlink', { name: data.member.name })}
				cancelLabel={i18n.t('household.action.cancel')}
			>
				{#snippet action(close)}
					<Form
						action="?/unlinkAccount"
						success="household.changes.saved"
						submitLabel={i18n.t('users.account.unlink')}
						variant="danger"
						onResult={close}
					/>
				{/snippet}
			</ConfirmDialog>
		{:else}
			<Badge label={i18n.t('users.account.none')} />

			<h3>{i18n.t('users.account.create_heading')}</h3>
			<p>{i18n.t('users.account.create_hint')}</p>
			<Form
				action="?/createAccount"
				success="users.accounts.done"
				submitLabel={i18n.t('users.account.create')}
			>
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
				<Select
					name="role"
					label={i18n.t('users.field.role')}
					value={accountForm?.values?.role ?? 'member'}
					options={(['member', 'admin'] as const).map((role) => ({
						value: role,
						label: i18n.t(roleLabel[role])
					}))}
				/>
				<PasswordInput
					label={i18n.t('users.field.temporary_password')}
					name="password"
					autoComplete="new-password"
					error={fieldError(i18n.t, accountForm, 'password')}
					required
				/>
			</Form>

			{#if data.unlinked.length > 0}
				<h3>{i18n.t('users.account.link_heading')}</h3>
				<Form
					action="?/linkAccount"
					success="users.accounts.done"
					submitLabel={i18n.t('users.account.link')}
				>
					<Select
						name="userId"
						label={i18n.t('users.account.link_field')}
						value={String(data.unlinked[0].userId)}
						options={data.unlinked.map((account) => ({
							value: String(account.userId),
							label: `${account.username} (${account.displayName})`
						}))}
					/>
				</Form>
			{/if}
		{/if}
	</Card>

	<div>
		<Card>
			<h2>{i18n.t('household.danger_zone')}</h2>
			{#if data.member.archivedAt}
				<Form
					action="?/unarchive"
					success="household.changes.saved"
					submitLabel={i18n.t('household.action.unarchive')}
				/>
			{:else}
				<ConfirmDialog
					triggerLabel={i18n.t('household.action.archive')}
					title={i18n.t('household.dialog.archive_member.title', { name: data.member.name })}
					description={i18n.t('household.confirm.archive_member', { name: data.member.name })}
					cancelLabel={i18n.t('household.action.cancel')}
				>
					{#snippet action(close)}<Form
							action="?/archive"
							success="household.changes.saved"
							submitLabel={i18n.t('household.action.archive')}
							variant="danger"
							onResult={close}
						/>{/snippet}
				</ConfirmDialog>
			{/if}
			{#if !data.member.firstLinkedAt}
				<ConfirmDialog
					triggerLabel={i18n.t('household.action.delete')}
					title={i18n.t('household.dialog.delete_member.title', { name: data.member.name })}
					description={i18n.t('household.confirm.delete_member', { name: data.member.name })}
					cancelLabel={i18n.t('household.action.cancel')}
				>
					{#snippet action(close)}<Form
							action="?/delete"
							success="household.changes.saved"
							submitLabel={i18n.t('household.action.delete')}
							variant="danger"
							onResult={close}
						/>{/snippet}
				</ConfirmDialog>
			{/if}
		</Card>
	</div>
</div>

<style>
	.member-panels {
		display: grid;
		gap: var(--space-4);
	}
	.error {
		margin: 0;
	}
</style>
