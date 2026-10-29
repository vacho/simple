import { defineEnvVars } from '@sveltejs/kit/env';

// Runtime configuration read by the app (D13); adapter-node reads its own variables (PORT, HOST...).
export const variables = defineEnvVars({
	DATABASE_PATH: {
		description: 'SQLite database file.',
		schema: (value) => value || './data/app.db'
	},
	BACKUP_DIR: {
		description: 'Directory of the scheduled and pre-migration backups.',
		schema: (value) => value || './data/backups'
	},
	I18N_PSEUDO: {
		description: 'Set to 1 to install the en-XA pseudo-locale for testing; never in production.',
		schema: (value) => value === '1'
	}
});
