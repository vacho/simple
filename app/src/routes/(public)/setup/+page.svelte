<script lang="ts">
	import Field from '#lib/components/Field.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import TimeZoneInput from '../TimeZoneInput.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('auth.setup.title')}</title>
</svelte:head>

<main>
	<h1>{i18n.t('auth.setup.title')}</h1>
	<p>{i18n.t('auth.setup.intro')}</p>
	<form method="POST">
		{#if formError(i18n.t, form)}
			<p class="error" role="alert">{formError(i18n.t, form)}</p>
		{/if}
		<Field
			label={i18n.t('users.field.display_name')}
			name="displayName"
			autocomplete="name"
			required
			defaultValue={form?.values?.displayName ?? ''}
			error={fieldError(i18n.t, form, 'displayName')}
		/>
		<Field
			label={i18n.t('users.field.username')}
			name="username"
			autocomplete="username"
			autocapitalize="none"
			required
			defaultValue={form?.values?.username ?? ''}
			error={fieldError(i18n.t, form, 'username')}
		/>
		<Field
			label={i18n.t('users.field.password')}
			name="password"
			type="password"
			autocomplete="new-password"
			required
			error={fieldError(i18n.t, form, 'password')}
		/>
		<TimeZoneInput />
		<button type="submit">{i18n.t('auth.setup.submit')}</button>
	</form>
</main>
