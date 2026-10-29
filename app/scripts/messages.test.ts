import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sourceHash } from '../src/lib/server/core/source-hash.ts';
import { checkCatalogs, readCatalog, sortCatalog, writeCatalog } from './messages.ts';

const features = ['auth', 'users'];
const locked = 'Try again in {minutes, plural, one {# minute} other {# minutes}}.';
let dir: string;

function write(en: Record<string, unknown>, es: Record<string, unknown>) {
	writeCatalog(dir, 'en', en);
	writeCatalog(dir, 'es', es);
}

const english = () => ({
	'auth.sign_in.locked': { text: locked, description: 'Lockout error on the sign-in page.' },
	'shell.home.title': { text: 'Home', description: 'Home page heading.' }
});
const spanish = () => ({
	'auth.sign_in.locked': {
		text: 'Inténtalo en {minutes, plural, one {# minuto} other {# minutos}}.',
		source: sourceHash(locked)
	},
	'shell.home.title': { text: 'Inicio', source: sourceHash('Home') }
});

beforeEach(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'simple-messages-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('Translation quality is enforced', () => {
	it('passes valid catalogs', () => {
		write(english(), spanish());
		expect(checkCatalogs(dir, features)).toEqual([]);
	});

	it('Missing Spanish text', () => {
		const es: Record<string, unknown> = spanish();
		delete es['shell.home.title'];
		write(english(), es);
		expect(checkCatalogs(dir, features)).toEqual(['es: shell.home.title is missing']);
		write(english(), { ...es, 'shell.home.title': { text: ' ', source: sourceHash('Home') } });
		expect(checkCatalogs(dir, features)).toEqual(['es: shell.home.title is missing']);
	});

	it('Missing translator description', () => {
		write({ ...english(), 'shell.home.title': { text: 'Home', description: '' } }, spanish());
		expect(checkCatalogs(dir, features)).toEqual(['en: shell.home.title has no description']);
	});

	it('Changed English text', () => {
		write(
			{ ...english(), 'shell.home.title': { text: 'Start', description: 'Heading.' } },
			spanish()
		);
		expect(checkCatalogs(dir, features)).toEqual([
			'es: shell.home.title translates an older English text; review it and update source'
		]);
	});

	it('rejects a Spanish text with a renamed placeholder', () => {
		const es = spanish();
		es['auth.sign_in.locked'].text =
			'Inténtalo en {minutos, plural, one {# minuto} other {# minutos}}.';
		write(english(), es);
		expect(checkCatalogs(dir, features)).toEqual([
			'es: auth.sign_in.locked uses different placeholders than the English text'
		]);
	});

	it('rejects invalid ICU syntax', () => {
		write(
			{ ...english(), 'shell.home.title': { text: 'Home {', description: 'Heading.' } },
			spanish()
		);
		expect(checkCatalogs(dir, features)).toContain(
			'en: shell.home.title is not valid ICU MessageFormat'
		);
	});

	it('rejects a key without an allowed prefix, and accepts a new feature folder', () => {
		const en = { 'sign_in.title': { text: 'Sign in', description: 'Title.' } };
		const es = { 'sign_in.title': { text: 'Entrar', source: sourceHash('Sign in') } };
		write(en, es);
		expect(checkCatalogs(dir, features)).toEqual([
			'en: sign_in.title must start with a feature folder name or common, shell, offline, validation, errors'
		]);
		expect(checkCatalogs(dir, [...features, 'sign_in'])).toEqual([]);
	});

	it('rejects keys out of order, and npm run i18n:sort fixes them', () => {
		const reversed = <T>(catalog: Record<string, T>) =>
			Object.fromEntries(Object.entries(catalog).reverse());
		write(reversed(english()), reversed(spanish()));
		expect(checkCatalogs(dir, features)).toEqual([
			'en: auth.sign_in.locked is out of order; run npm run i18n:sort',
			'es: auth.sign_in.locked is out of order; run npm run i18n:sort'
		]);
		for (const locale of ['en', 'es'])
			writeCatalog(dir, locale, sortCatalog(readCatalog(dir, locale)));
		expect(checkCatalogs(dir, features)).toEqual([]);
	});
});
