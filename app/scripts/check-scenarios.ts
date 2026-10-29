// Strict traceability (D11): every scenario of the specs has a test whose name quotes it.
// npm run check:scenarios -- <change-id> reads that change's specs; without an id, the main
// specs in openspec/specs/. Fails, naming each scenario without a test, or when there are no
// scenarios to check.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { missingScenarios, scenariosOf } from './scenarios.ts';

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

const specs = files(specsDir, (file) => path.basename(file) === 'spec.md').map((spec) => ({
	capability: path.relative(specsDir, path.dirname(spec)),
	text: readFileSync(spec, 'utf8')
}));
// An empty or mistyped folder has nothing to check: that is not a pass.
if (!specs.some(({ text }) => scenariosOf(text).length > 0)) {
	console.error(`No scenarios found in ${path.relative(process.cwd(), specsDir)}.`);
	process.exit(1);
}

const missing = missingScenarios(specs, tests);

if (missing.length > 0) {
	console.error(`${missing.length} scenario(s) without a test quoting them:`);
	for (const entry of missing) console.error(`  ${entry}`);
	process.exit(1);
}
console.log(`Every scenario in ${path.relative(process.cwd(), specsDir)} has a test.`);
