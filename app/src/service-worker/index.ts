// The service worker (D9): installability, and an offline page instead of a browser error. It
// caches only the app's own files, the offline page and the last used language code, never a
// page or API response, so financial data never sits in its cache.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';

const cacheName = `app-${version}`;
const offlinePage = '/offline';
const localeEntry = '/__meta/locale';
const precached = new Set([...immutable, ...assets].map(({ path }) => `/${path}`));

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(cacheName).then((cache) => cache.addAll([...precached, offlinePage]))
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const name of await caches.keys()) {
				if (name !== cacheName) await caches.delete(name);
			}
			// Control the page on the very first visit, so going offline right after it works.
			await self.clients.claim();
		})()
	);
});

// The page sends its locale on every load: kept as one entry holding only the language code,
// and the offline page is refreshed so languages installed since then are included.
self.addEventListener('message', (event) => {
	const locale: unknown = event.data?.locale;
	if (event.data?.type !== 'locale' || typeof locale !== 'string') return;
	if (!/^[A-Za-z0-9-]{2,35}$/.test(locale)) return;
	event.waitUntil(
		caches.open(cacheName).then(async (cache) => {
			await cache.put(localeEntry, new Response(locale));
			await cache.add(offlinePage).catch(() => {});
		})
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => (await caches.match(offlinePage)) ?? Response.error())
		);
		return;
	}
	if (precached.has(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
	}
});
