<script lang="ts">
	import Field from '#lib/components/Field.svelte';
	import { fieldError, formError } from '#lib/components/form-errors.ts';
	import { getI18n } from '#lib/i18n/t.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head>
	<title>{i18n.t('auth.password.title')}</title>
</svelte:head>

<h1>{i18n.t('auth.password.title')}</h1>
<p>{i18n.t('auth.password.intro')}</p>

<form method="POST">
	{#if formError(i18n.t, form)}
		<p class="error" role="alert">{formError(i18n.t, form)}</p>
	{/if}
	<Field
		label={i18n.t('auth.password.new')}
		name="password"
		type="password"
		autocomplete="new-password"
		error={fieldError(i18n.t, form, 'password')}
		required
	/>
	<Field
		label={i18n.t('auth.password.confirm')}
		name="confirm"
		type="password"
		autocomplete="new-password"
		error={fieldError(i18n.t, form, 'confirm')}
		required
	/>
	<button type="submit">{i18n.t('auth.password.save')}</button>
</form>

<form method="POST" action="/logout">
	<button type="submit">{i18n.t('auth.sign_out')}</button>
</form>
