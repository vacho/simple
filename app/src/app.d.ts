// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/** package.json version, injected at build time (vite.config.ts). */
	const __APP_VERSION__: string;

	namespace App {
		interface Error {
			/** Message key the error page translates; message stays plain text for logs. */
			key?: string;
		}
		interface Locals {
			db: import('#lib/server/db/client.ts').Db;
			actor: import('#lib/server/core/actor.ts').Actor;
			locale: string;
			dictionaryUrl: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
