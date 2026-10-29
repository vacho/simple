import { defineEnvVars } from '@sveltejs/kit/env';

// Runtime configuration read by the app (D13); adapter-node reads its own variables (PORT, HOST...).
export const variables = defineEnvVars({
	DATABASE_PATH: {
		description: 'SQLite database file.',
		schema: (value) => value || './data/app.db'
	}
});
