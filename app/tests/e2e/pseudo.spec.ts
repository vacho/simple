// The en-XA pseudo-locale exists only when the server starts with I18N_PSEUDO=1 (D14).
import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

async function homeInPseudoLocale(port: number, flag: Record<string, string>) {
	const dir = mkdtempSync(path.join(tmpdir(), 'simple-pseudo-'));
	const env: NodeJS.ProcessEnv = {
		...process.env,
		PORT: String(port),
		DATABASE_PATH: path.join(dir, 'app.db')
	};
	delete env.I18N_PSEUDO;
	const server = spawn('node', ['build'], { cwd: root, env: { ...env, ...flag } });
	let output = '';
	server.stderr.on('data', (chunk) => (output += chunk));
	await new Promise<void>((resolve) =>
		server.stdout.on('data', (chunk) => String(chunk).includes('Listening') && resolve())
	);
	const response = await fetch(`http://localhost:${port}/`, {
		headers: { 'accept-language': 'en-XA' }
	});
	const html = await response.text();
	server.kill();
	rmSync(dir, { recursive: true, force: true });
	return { html, output };
}

test('a production start without the flag has no en-XA', async () => {
	const { html, output } = await homeInPseudoLocale(4191, {});
	expect(html).toContain('<html lang="en" dir="ltr">');
	expect(html).toContain('<h1>Home</h1>');
	expect(output).not.toContain('I18N_PSEUDO');
});

test('with I18N_PSEUDO=1 every text is pseudo-localized, with a startup warning', async () => {
	const { html, output } = await homeInPseudoLocale(4192, { I18N_PSEUDO: '1' });
	expect(html).toContain('<html lang="en-XA" dir="ltr">');
	expect(html).toMatch(/<h1>\[Ĥöɱé ~+\]<\/h1>/);
	expect(output).toContain('I18N_PSEUDO is set');
});

test('.env.example does not set the flag', () => {
	expect(readFileSync(path.join(root, '.env.example'), 'utf8')).not.toContain('I18N_PSEUDO');
});
