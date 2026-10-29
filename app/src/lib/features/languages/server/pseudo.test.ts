import { IntlMessageFormat } from 'intl-messageformat';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { systemActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { createTranslator } from '../../../i18n/t.ts';
import en from '../../../../../messages/en.json' with { type: 'json' };
import { getDictionary, listInstalled, seed } from './service.ts';

const db = createTestDatabase();
const ctx = testCtx(db);
const system = testCtx(db, { actor: systemActor('test seed') });
// Every argument gets a value, whatever its name.
const anyParams = new Proxy({}, { get: () => 3, has: () => true }) as Record<string, number>;

describe('the en-XA pseudo-locale', () => {
	it('is installed only when the server starts with I18N_PSEUDO=1', () => {
		seed(system, { pseudoLocale: true });
		expect(listInstalled(ctx)).toContain('en-XA');
		seed(system);
		expect(listInstalled(ctx)).not.toContain('en-XA');
		expect(getDictionary(ctx, 'en-XA').locale).toBe('en');
	});

	it('transforms every English text: accents, brackets and about 35% more length', () => {
		seed(system, { pseudoLocale: true });
		const pseudo = getDictionary(ctx, 'en-XA');
		for (const [key, { text }] of Object.entries(en)) {
			const english = String(new IntlMessageFormat(text, 'en').format(anyParams));
			const shown = String(new IntlMessageFormat(pseudo.messages[key], 'en').format(anyParams));
			expect(shown, key).toMatch(/^\[.* ~+\]$/);
			expect(shown, key).not.toMatch(/[a-zA-Z]/);
			expect(shown.length, key).toBeGreaterThanOrEqual(english.length * 1.3);
		}
	});
});

describe('dictionary cost (D14)', () => {
	it('keeps the Spanish dictionary at most 10 KB gzip-compressed', () => {
		seed(system);
		const size = gzipSync(getDictionary(ctx, 'es').body).length;
		console.info(`Spanish dictionary: ${size} bytes gzip-compressed`);
		expect(size).toBeLessThanOrEqual(10 * 1024);
	});

	it('takes under 5 microseconds on average for a server-side lookup', () => {
		const t = createTranslator('es', getDictionary(ctx, 'es').messages);
		const lookups = 100_000;
		for (let i = 0; i < 1000; i++) t('auth.sign_in.locked', { minutes: i });
		const start = performance.now();
		for (let i = 0; i < lookups; i++) {
			t('shell.home.title');
			t('auth.sign_in.locked', { minutes: i % 60 });
		}
		const microseconds = ((performance.now() - start) * 1000) / (lookups * 2);
		console.info(`Server-side lookup: ${microseconds.toFixed(2)} µs on average`);
		expect(microseconds).toBeLessThan(5);
	});
});
