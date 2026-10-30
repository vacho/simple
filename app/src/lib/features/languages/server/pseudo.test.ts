import { IntlMessageFormat } from 'intl-messageformat';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { systemActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
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
});
