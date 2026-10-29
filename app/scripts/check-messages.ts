// Fails npm run check when the message catalogs break a translation rule (D14).
import { checkCatalogs, featureNames, featuresDir, messagesDir } from './messages.ts';

const problems = checkCatalogs(messagesDir, featureNames(featuresDir));
if (problems.length > 0) {
	console.error(`Message catalogs have ${problems.length} problem(s):`);
	for (const problem of problems) console.error(`  ${problem}`);
	process.exit(1);
}
