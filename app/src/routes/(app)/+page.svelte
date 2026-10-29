<script lang="ts">
	import { getI18n } from '#lib/i18n/t.ts';

	const i18n = getI18n();
</script>

<h1>{i18n.t('shell.home.title')}</h1>

<!-- Until the signed-in frame and its user menu (task 9.2). -->
<form method="POST" action="/logout">
	<button type="submit">{i18n.t('auth.sign_out')}</button>
</form>
