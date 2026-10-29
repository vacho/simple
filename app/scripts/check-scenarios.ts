// Strict traceability (D11): every scenario of the specs has a test whose name quotes it.
// npm run check:scenarios -- <change-id> reads that change's specs; without an id, the main
// specs in openspec/specs/. Fails, naming each scenario without a test.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const openspec = path.resolve(appRoot, '../openspec');
const change = process.argv[2];
const specsDir = change
	? path.join(openspec, 'changes', change, 'specs')
	: path.join(openspec, 'specs');

function files(dir: string, keep: (file: string) => boolean): string[] {
	return readdirSync(dir).flatMap((name) => {
		const file = path.join(dir, name);
		if (statSync(file).isDirectory()) {
			return name === 'node_modules' || name === 'fixtures' ? [] : files(file, keep);
		}
		return keep(file) ? [file] : [];
	});
}

const tests = ['src', 'scripts', 'tests']
	.flatMap((dir) => files(path.join(appRoot, dir), (file) => /\.(test|spec)\.ts$/.test(file)))
	.map((file) => readFileSync(file, 'utf8'))
	.join('\n');

const missing = files(specsDir, (file) => path.basename(file) === 'spec.md').flatMap((spec) => {
	const capability = path.relative(specsDir, path.dirname(spec));
	return [...readFileSync(spec, 'utf8').matchAll(/^#### Scenario: (.+)$/gm)]
		.map((match) => match[1].trim())
		.filter((scenario) => !tests.includes(scenario))
		.map((scenario) => `${capability}: ${scenario}`);
});

if (missing.length > 0) {
	console.error(`${missing.length} scenario(s) without a test quoting them:`);
	for (const entry of missing) console.error(`  ${entry}`);
	process.exit(1);
}
console.log(`Every scenario in ${path.relative(process.cwd(), specsDir)} has a test.`);
