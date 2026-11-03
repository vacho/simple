<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Form from '#lib/components/Form.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import Select from '#lib/components/Select.svelte';
	import { fieldError, formError, type FormFailure } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';

	interface Props {
		account: {
			userId: number;
			username: string;
			role: 'admin' | 'member';
			active: boolean;
			passwordTemporary: boolean;
		};
		own: boolean;
		form: FormFailure | null | undefined;
	}
	let { account, own, form }: Props = $props();
	const i18n = getI18n();
	const roleLabel = { admin: 'users.role.admin', member: 'users.role.member' } as const;
	const failed = $derived(
		form?.values?.form === 'account' && form.values.userId === String(account.userId) ? form : null
	);
</script>

<div class="account">
	<div class="facts">
		{#if account.passwordTemporary}
			<Badge tone="warning" label={i18n.t('users.account.state_temporary')} />
		{/if}
		<span>{i18n.t('users.account.username', { username: account.username })}</span>
		<Badge
			tone={account.role === 'admin' ? 'info' : 'neutral'}
			label={i18n.t(roleLabel[account.role])}
		/>
		<Badge
			tone={account.active ? 'success' : 'warning'}
			label={i18n.t(account.active ? 'users.account.state_active' : 'users.account.state_inactive')}
		/>
	</div>
	{#if own}
		<p>{i18n.t('users.account.own')}</p>
	{:else}
		{#if formError(i18n.t, failed)}<p class="error" role="alert">
				{formError(i18n.t, failed)}
			</p>{/if}
		{#if fieldError(i18n.t, failed, 'password')}<p class="error" role="alert">
				{fieldError(i18n.t, failed, 'password')}
			</p>{/if}
		<Form
			action="?/setRole"
			success="users.accounts.done"
			submitLabel={i18n.t('users.account.change_role')}
		>
			<input type="hidden" name="userId" value={account.userId} />
			<Select
				name="role"
				label={i18n.t('users.field.role')}
				value={account.role}
				options={(['member', 'admin'] as const).map((role) => ({
					value: role,
					label: i18n.t(roleLabel[role])
				}))}
			/>
		</Form>
		<div class="actions">
			<ConfirmDialog
				triggerLabel={i18n.t('users.account.reset_password')}
				title={i18n.t('users.dialog.reset.title', { username: account.username })}
				description={i18n.t('users.confirm.reset', { username: account.username })}
				cancelLabel={i18n.t('household.action.cancel')}
			>
				{#snippet action(close)}
					<Form
						action="?/resetPassword"
						success="users.accounts.done"
						submitLabel={i18n.t('users.account.reset_password')}
						variant="danger"
						onResult={close}
					>
						<input type="hidden" name="userId" value={account.userId} />
						<PasswordInput
							label={i18n.t('users.field.temporary_password')}
							name="password"
							autoComplete="new-password"
							required
						/>
					</Form>
				{/snippet}
			</ConfirmDialog>
			{#if account.active}
				<ConfirmDialog
					triggerLabel={i18n.t('users.account.deactivate')}
					title={i18n.t('users.dialog.deactivate.title', { username: account.username })}
					description={i18n.t('users.confirm.deactivate', { username: account.username })}
					cancelLabel={i18n.t('household.action.cancel')}
				>
					{#snippet action(close)}
						<Form
							action="?/deactivate"
							success="users.accounts.done"
							submitLabel={i18n.t('users.account.deactivate')}
							variant="danger"
							onResult={close}
						>
							<input type="hidden" name="userId" value={account.userId} />
						</Form>
					{/snippet}
				</ConfirmDialog>
			{:else}
				<Form
					action="?/reactivate"
					success="users.accounts.done"
					submitLabel={i18n.t('users.account.reactivate')}
				>
					<input type="hidden" name="userId" value={account.userId} />
				</Form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.account {
		display: grid;
		gap: var(--space-3);
	}
	.facts,
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}
	p {
		margin: 0;
	}
</style>
