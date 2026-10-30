<script lang="ts">
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import Form from '#lib/components/Form.svelte';
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Select from '#lib/components/Select.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form: result }: PageProps = $props();
	const i18n = getI18n();
	// Each form shows only its own errors.
	const passwordForm = $derived(result?.values?.form === 'password' ? result : null);
	const form = $derived(passwordForm ? null : result);
	const locale = $derived(form?.values?.locale ?? data.profile.locale ?? '');
	const zoneError = $derived(fieldError(i18n.t, form, 'timeZone'));
	const localeError = $derived(fieldError(i18n.t, form, 'locale'));
</script>

<svelte:head>
	<title>{i18n.t('users.profile.title')}</title>
</svelte:head>

<PageHeader title={i18n.t('users.profile.title')} subtitle={i18n.t('users.profile.intro')} />

<div class="profile">
	<Card
		><Form action="?/save" success="users.profile.saved" submitLabel={i18n.t('users.profile.save')}>
			{#if formError(i18n.t, form)}
				<p class="error" role="alert">{formError(i18n.t, form)}</p>
			{/if}

			{#key locale}
				<Select
					name="locale"
					label={i18n.t('users.field.language')}
					value={locale}
					error={localeError}
					options={[
						{ value: '', label: i18n.t('users.profile.browser_default') },
						...data.languages.map((language) => ({ value: language.code, label: language.name }))
					]}
				/>
			{/key}

			{#key data.profile.timeZone}
				<Select
					name="timeZone"
					label={i18n.t('users.field.time_zone')}
					value={data.profile.timeZone ?? 'UTC'}
					error={zoneError}
					options={data.timeZones.map((zone) => ({ value: zone, label: zone }))}
				/>
			{/key}
		</Form></Card
	>

	<Card>
		<h2>{i18n.t('auth.password.section')}</h2>
		<p>{i18n.t('auth.password.section_hint')}</p>
		<Form
			action="?/password"
			success="auth.password.changed"
			submitLabel={i18n.t('auth.password.save')}
		>
			{#if formError(i18n.t, passwordForm)}
				<p class="error" role="alert">{formError(i18n.t, passwordForm)}</p>
			{/if}
			<PasswordInput
				label={i18n.t('auth.password.current')}
				name="current"
				autoComplete="current-password"
				error={fieldError(i18n.t, passwordForm, 'current')}
				required
			/>
			<PasswordInput
				label={i18n.t('auth.password.new')}
				name="password"
				autoComplete="new-password"
				error={fieldError(i18n.t, passwordForm, 'password')}
				required
			/>
			<PasswordInput
				label={i18n.t('auth.password.confirm')}
				name="confirm"
				autoComplete="new-password"
				error={fieldError(i18n.t, passwordForm, 'confirm')}
				required
			/>
		</Form>
	</Card>
</div>

<style>
	.profile {
		display: grid;
		gap: var(--space-3);
		max-inline-size: 28rem;
	}

	.profile :global(form) {
		display: grid;
		gap: var(--space-3);
	}

	.error {
		margin: 0;
	}
</style>
