// No account enumeration through timing (D4): unknown usernames are checked against a dummy hash
// with the same parameters, so both paths take comparable time. Runs serially, after a warm-up,
// with a fresh throttle state for every attempt.
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { testCtx } from '../../../server/core/ctx.ts';
import { Invalid } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { users } from '../../../server/db/schema.ts';
import { hashPassword } from './password.ts';
import { loginAttempts } from './schema.ts';
import { signIn } from './service.ts';

const db = createTestDatabase();
const ctx = testCtx(db);
db.insert(users)
	.values({
		username: 'luis',
		displayName: 'Luis',
		passwordHash: await hashPassword('correct horse'),
		role: 'member',
		createdAt: new Date()
	})
	.run();

async function timeAttempt(username: string): Promise<number> {
	db.delete(loginAttempts).run();
	const start = performance.now();
	const error = await signIn(ctx, { username, password: 'wrong pass', address: '10.2.0.1' }).catch(
		(caught) => caught
	);
	const elapsed = performance.now() - start;
	expect(error).toBeInstanceOf(Invalid);
	return elapsed;
}

const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

describe('No account enumeration', () => {
	it('takes comparable time for unknown and existing usernames', { timeout: 60_000 }, async () => {
		for (let i = 0; i < 5; i++) {
			await timeAttempt('luis');
			await timeAttempt(`warmup${i}`);
		}
		const existing: number[] = [];
		const unknown: number[] = [];
		for (let i = 0; i < 30; i++) {
			existing.push(await timeAttempt('luis'));
			unknown.push(await timeAttempt(`nobody${i}`));
		}
		const [a, b] = [median(existing), median(unknown)];
		console.info(`Median sign-in time: existing ${a.toFixed(1)} ms, unknown ${b.toFixed(1)} ms`);
		expect(Math.max(a, b) / Math.min(a, b)).toBeLessThanOrEqual(1.5);
	});
});
