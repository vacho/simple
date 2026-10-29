import Database from 'better-sqlite3';
import { IntlMessageFormat } from 'intl-messageformat';
import { afterAll, describe, expect, it } from 'vitest';
import { systemActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { sourceHash } from '../../../server/core/source-hash.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import en from '../../../../../messages/en.json' with { type: 'json' };
import {
	getDictionary,
	getDictionaryFile,
	listInstalled,
	seed,
	type Dictionary
} from './service.ts';

const db = createTestDatabase();
const ctx = testCtx(db);
seed(testCtx(db, { actor: systemActor('test seed') }));

// Another connection, like an administrator's tool writing while the app runs.
const other = new Database(db.$client.name);
afterAll(() => other.close());
const now = Date.now();
const install = (code: string, texts: Record<string, [text: string, source: string]> = {}) => {
	other.prepare("INSERT INTO languages VALUES (?, 'active', 0, ?)").run(code, now);
	for (const [key, [text, source]] of Object.entries(texts)) {
		other
			.prepare("INSERT INTO translations VALUES (?, ?, ?, 'human', ?, ?)")
			.run(code, key, text, source, now);
	}
};
const current = (key: keyof typeof en) => sourceHash(en[key].text);
const render = (dictionary: Dictionary, key: string, params?: Record<string, number>) =>
	String(new IntlMessageFormat(dictionary.messages[key], dictionary.locale).format(params));

describe('languages', () => {
	it('installs English and Spanish at startup', () => {
		expect(listInstalled(ctx)).toEqual(['en', 'es']);
		expect(render(getDictionary(ctx, 'es'), 'shell.home.title')).toBe('Inicio');
	});

	it('Install French: served without a restart once installed and activated', () => {
		install('fr', { 'shell.home.title': ['Accueil', current('shell.home.title')] });
		expect(listInstalled(ctx)).toContain('fr');
		const { url } = getDictionary(ctx, 'fr');
		const file = getDictionaryFile(ctx, url.slice('/i18n/'.length));
		expect(file && render(file, 'shell.home.title')).toBe('Accueil');
	});

	it('Regional fallback: es-BO falls back to Spanish for the texts it lacks', () => {
		install('es-BO', { 'shell.home.title': ['Inicio (BO)', current('shell.home.title')] });
		const dictionary = getDictionary(ctx, 'es-BO');
		expect(render(dictionary, 'shell.home.title')).toBe('Inicio (BO)');
		expect(render(dictionary, 'auth.sign_in.locked', { minutes: 2 })).toContain('minutos');
	});

	it('Runtime fallback: a text missing in the language and its parents is English', () => {
		install('de');
		expect(render(getDictionary(ctx, 'de'), 'shell.home.title')).toBe('Home');
	});

	it('Stale translation of an installed language: still shown, reported as stale', () => {
		install('it', { 'shell.home.title': ['Casa', sourceHash('Start')] });
		const dictionary = getDictionary(ctx, 'it');
		expect(render(dictionary, 'shell.home.title')).toBe('Casa');
		expect(dictionary.stale).toEqual(['shell.home.title']);
	});

	it('Incompatible stale translation: skipped for the parent language or English, reported', () => {
		const old = 'Try again in {minutos, plural, one {# minuto} other {# minutos}}.';
		install('pt', { 'auth.sign_in.locked': ['Tente em {minutos} minutos.', sourceHash(old)] });
		const pt = getDictionary(ctx, 'pt');
		expect(render(pt, 'auth.sign_in.locked', { minutes: 2 })).toBe(
			new IntlMessageFormat(en['auth.sign_in.locked'].text, 'pt').format({ minutes: 2 })
		);
		expect(pt.stale).toEqual(['auth.sign_in.locked']);

		install('es-MX', { 'auth.sign_in.locked': ['Intenta en {minutos} minutos.', sourceHash(old)] });
		const mx = getDictionary(ctx, 'es-MX');
		expect(render(mx, 'auth.sign_in.locked', { minutes: 2 })).toContain('Vuelve a intentarlo');
		expect(mx.stale).toEqual(['auth.sign_in.locked']);
	});

	it('the seed keeps a text edited by a person', () => {
		other
			.prepare(
				"UPDATE translations SET value = 'Portada', origin = 'human' WHERE locale = 'es' AND key = ?"
			)
			.run('shell.home.title');
		seed(testCtx(db, { actor: systemActor('test seed again') }));
		expect(render(getDictionary(ctx, 'es'), 'shell.home.title')).toBe('Portada');
	});

	it('changes the dictionary URL when a translation changes', () => {
		const before = getDictionary(ctx, 'es').url;
		other
			.prepare("UPDATE translations SET value = 'Principal' WHERE locale = 'es' AND key = ?")
			.run('shell.home.title');
		const after = getDictionary(ctx, 'es').url;
		expect(after).not.toBe(before);
		expect(getDictionaryFile(ctx, before.slice('/i18n/'.length))).toBeUndefined();
	});

	it('serves English for a locale that is not installed, and only the seed to the system', () => {
		expect(getDictionary(ctx, 'ja').locale).toBe('en');
		expect(() => seed(ctx)).toThrow('errors.forbidden');
	});
});
