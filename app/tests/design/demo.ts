// npm run demo -- <path> (ADR 0030): a database with the demo household, for designing and
// capturing with fictitious data. Start the app on it with DATABASE_PATH=<path>. It refuses an
// existing file, so it can never write into the household's real database.
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { appRoot, prepareDatabase } from '../e2e/app.ts';
import { demoAdmin, seedDemoHousehold } from './demo-household.ts';

const target = path.resolve(process.argv[2] ?? path.join(appRoot, 'data/demo/app.db'));
if (existsSync(target)) {
	console.error(
		`${target} already exists; choose a new path (the demo never writes into a database).`
	);
	process.exit(1);
}
mkdirSync(path.dirname(target), { recursive: true });
await prepareDatabase(target, seedDemoHousehold);
console.log(`Demo household written to ${target}.`);
console.log(
	`Start the app with DATABASE_PATH=${target} and sign in as "${demoAdmin.username}" / "${demoAdmin.password}".`
);
