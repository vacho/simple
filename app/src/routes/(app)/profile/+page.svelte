<script lang="ts">
	import Field from '#lib/components/Field.svelte';
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

<h1>{i18n.t('users.profile.title')}</h1>
<p>{i18n.t('users.profile.intro')}</p>

<form method="POST" action="?/save" class="profile">
	{#if formError(i18n.t, form)}
		<p class="error" role="alert">{formError(i18n.t, form)}</p>
	{/if}

	<div class="field">
		<label for="locale">{i18n.t('users.field.language')}</label>
		<select
			id="locale"
			name="locale"
			aria-invalid={localeError ? 'true' : undefined}
			aria-describedby={localeError ? 'locale-error' : undefined}
		>
			<option value="" selected={locale === ''}>{i18n.t('users.profile.browser_default')}</option>
			{#each data.languages as language (language.code)}
				<option value={language.code} lang={language.code} selected={locale === language.code}>
					{language.name}
				</option>
			{/each}
		</select>
		{#if localeError}<p id="locale-error" class="error">{localeError}</p>{/if}
	</div>

	<div class="field">
		<label for="timeZone">{i18n.t('users.field.time_zone')}</label>
		<!-- After a rejected zone, the previous one stays selected: nothing was saved. -->
		<select
			id="timeZone"
			name="timeZone"
			aria-invalid={zoneError ? 'true' : undefined}
			aria-describedby={zoneError ? 'timeZone-error' : undefined}
		>
			{#each data.timeZones as zone (zone)}
				<option value={zone} selected={(data.profile.timeZone ?? 'UTC') === zone}>{zone}</option>
			{/each}
		</select>
		{#if zoneError}<p id="timeZone-error" class="error">{zoneError}</p>{/if}
	</div>

	<button type="submit">{i18n.t('users.profile.save')}</button>
</form>

<section class="profile">
	<h2>{i18n.t('auth.password.section')}</h2>
	<p>{i18n.t('auth.password.section_hint')}</p>
	{#if data.passwordChanged && !result}
		<p role="status">{i18n.t('auth.password.changed')}</p>
	{/if}
	<form method="POST" action="?/password" class="profile">
		{#if formError(i18n.t, passwordForm)}
			<p class="error" role="alert">{formError(i18n.t, passwordForm)}</p>
		{/if}
		<Field
			label={i18n.t('auth.password.current')}
			name="current"
			type="password"
			autocomplete="current-password"
			error={fieldError(i18n.t, passwordForm, 'current')}
			required
		/>
		<Field
			label={i18n.t('auth.password.new')}
			name="password"
			type="password"
			autocomplete="new-password"
			error={fieldError(i18n.t, passwordForm, 'password')}
			required
		/>
		<Field
			label={i18n.t('auth.password.confirm')}
			name="confirm"
			type="password"
			autocomplete="new-password"
			error={fieldError(i18n.t, passwordForm, 'confirm')}
			required
		/>
		<button type="submit">{i18n.t('auth.password.save')}</button>
	</form>
</section>

<style>
	.profile {
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
