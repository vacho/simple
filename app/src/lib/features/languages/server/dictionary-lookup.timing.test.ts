// Dictionary lookup cost (D14). A timing test: npm run test:unit runs it after the other tests,
// alone, so a busy machine doesn't skew the measurement.
import { performance } from 'node:perf_hooks';
import { expect, it } from 'vitest';
import { systemActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { createTranslator } from '../../../i18n/t.ts';
import { getDictionary, seed } from './service.ts';

const db = createTestDatabase();
seed(testCtx(db, { actor: systemActor('test seed') }));

it('takes under 5 microseconds on average for a server-side lookup', () => {
	const t = createTranslator('es', getDictionary(testCtx(db), 'es').messages);
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
