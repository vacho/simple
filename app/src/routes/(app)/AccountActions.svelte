<script lang="ts">
	import Field from '#lib/components/Field.svelte';
	import { fieldError, formError, type FormFailure } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';

	interface Props {
		account: { userId: number; username: string; role: 'admin' | 'member'; active: boolean };
		/** The signed-in administrator's own account: no actions (ADR 0027). */
		own: boolean;
		confirm: { action: 'reset' | 'deactivate'; userId: number } | null;
		form: FormFailure | null | undefined;
	}

	let { account, own, confirm, form }: Props = $props();
	const i18n = getI18n();
	const roleLabel = { admin: 'users.role.admin', member: 'users.role.member' } as const;
	const failed = $derived(
		form?.values?.form === 'account' && form.values.userId === String(account.userId) ? form : null
	);
	const confirming = $derived(
		confirm?.userId === account.userId
			? confirm.action
			: (['reset', 'deactivate'] as const).find((action) => action === failed?.values?.confirm)
	);
</script>

<div class="account">
	<p>
		{i18n.t('users.account.username', { username: account.username })} ·
		{i18n.t(roleLabel[account.role])} ·
		{i18n.t(account.active ? 'users.account.state_active' : 'users.account.state_inactive')}
	</p>

	{#if own}
		<p>{i18n.t('users.account.own')}</p>
	{:else}
		{#if failed && formError(i18n.t, failed)}
			<p class="error" role="alert">{formError(i18n.t, failed)}</p>
		{/if}

		{#if confirming}
			<div class="confirm">
				<p>
					{confirming === 'reset'
						? i18n.t('users.confirm.reset', { username: account.username })
						: i18n.t('users.confirm.deactivate', { username: account.username })}
				</p>
				<form
					method="POST"
					action={confirming === 'reset' ? '?/resetPassword' : '?/deactivate'}
					class="stack"
				>
					<input type="hidden" name="userId" value={account.userId} />
					<input type="hidden" name="confirm" value={confirming} />
					{#if confirming === 'reset'}
						<Field
							label={i18n.t('users.field.temporary_password')}
							name="password"
							type="text"
							autocomplete="off"
							error={fieldError(i18n.t, failed, 'password')}
							required
						/>
					{/if}
					<button type="submit">
						{i18n.t(
							confirming === 'reset' ? 'users.account.reset_password' : 'users.account.deactivate'
						)}
					</button>
				</form>
				<!-- A form of its own: cancelling sends nothing that was typed. -->
				<form method="GET">
					<button type="submit">{i18n.t('household.action.cancel')}</button>
				</form>
			</div>
		{/if}

		<div class="row">
			<form method="POST" action="?/setRole" class="row">
				<input type="hidden" name="userId" value={account.userId} />
				<label for="role-{account.userId}">{i18n.t('users.field.role')}</label>
				<select id="role-{account.userId}" name="role">
					{#each ['member', 'admin'] as const as role (role)}
						<option value={role} selected={account.role === role}>{i18n.t(roleLabel[role])}</option>
					{/each}
				</select>
				<button type="submit">{i18n.t('users.account.change_role')}</button>
			</form>
			<form method="GET">
				<input type="hidden" name="confirm" value="reset" />
				<input type="hidden" name="user" value={account.userId} />
				<button type="submit">{i18n.t('users.account.reset_password')}</button>
			</form>
			{#if account.active}
				<form method="GET">
					<input type="hidden" name="confirm" value="deactivate" />
					<input type="hidden" name="user" value={account.userId} />
					<button type="submit">{i18n.t('users.account.deactivate')}</button>
				</form>
			{:else}
				<form method="POST" action="?/reactivate">
					<input type="hidden" name="userId" value={account.userId} />
					<button type="submit">{i18n.t('users.account.reactivate')}</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.account {
		display: grid;
		gap: var(--space-2);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}

	.stack {
		display: grid;
		gap: var(--space-2);
	}

	.confirm {
		display: grid;
		gap: var(--space-2);
		max-inline-size: 28rem;
		padding: var(--space-3);
		border: 1px solid var(--color-border);
	}

	label {
		font-weight: 600;
	}

	p {
		margin: 0;
	}
</style>
