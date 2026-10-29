<script lang="ts">
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const locale = $derived(form?.values?.locale ?? data.profile.locale ?? '');
	const zoneError = $derived(fieldError(i18n.t, form, 'timeZone'));
	const localeError = $derived(fieldError(i18n.t, form, 'locale'));
</script>

<svelte:head>
	<title>{i18n.t('users.profile.title')}</title>
</svelte:head>

<h1>{i18n.t('users.profile.title')}</h1>
<p>{i18n.t('users.profile.intro')}</p>

<form method="POST" class="profile">
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
