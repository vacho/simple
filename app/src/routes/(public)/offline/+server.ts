// The offline page (D9): self-contained HTML, cached by the service worker, holding the offline
// texts of every installed language. Its script picks the language last used on the device,
// else the browser's, with the same matcher as the server (D14), else English.
import { getDictionary, listInstalled } from '#lib/features/languages/server/index.ts';
import { matchLocale, textDirection } from '#lib/i18n/locale.ts';
import { createTranslator } from '#lib/i18n/t.ts';
import { buildCtx } from '#lib/server/web/ctx.ts';
import type { RequestHandler } from './$types';

const escapeHtml = (text: string) =>
	text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

export const GET: RequestHandler = (event) => {
	const ctx = buildCtx(event);
	const texts = Object.fromEntries(
		listInstalled(ctx).map((code) => {
			const t = createTranslator(code, getDictionary(ctx, code).messages);
			return [code, { title: t('offline.title'), message: t('offline.message') }];
		})
	);
	const { title, message } = texts.en;
	// JSON inside a script: "<" is escaped so no text can close the script element.
	const data = JSON.stringify(texts).replace(/</g, '\\u003c');
	const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#1f5fbf">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; --bg: #ffffff; --text: #1b1f24; }
@media (prefers-color-scheme: dark) { :root { --bg: #121417; --text: #e8eaed; } }
body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; }
main { max-inline-size: 28rem; margin-inline: auto; padding: 3rem 1rem; text-align: start; }
</style>
</head>
<body>
<main><h1 id="title">${escapeHtml(title)}</h1><p id="message">${escapeHtml(message)}</p></main>
<script>
(async () => {
	const texts = ${data};
	const matchLocale = ${matchLocale.toString()};
	const textDirection = ${textDirection.toString()};
	let locale;
	try {
		const stored = await caches.match('/__meta/locale');
		if (stored) locale = (await stored.text()).trim();
	} catch {}
	if (!texts[locale]) locale = matchLocale(navigator.languages, Object.keys(texts)) ?? 'en';
	document.documentElement.lang = locale;
	document.documentElement.dir = textDirection(locale);
	document.title = texts[locale].title;
	document.getElementById('title').textContent = texts[locale].title;
	document.getElementById('message').textContent = texts[locale].message;
})();
</script>
</body>
</html>`;
	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }
	});
};
