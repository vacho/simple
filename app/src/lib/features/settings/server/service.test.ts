import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { systemActor, type UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Forbidden } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { seed } from '../../languages/server/index.ts';
import { getOverview } from './service.ts';

const db = createTestDatabase();
seed(testCtx(db, { actor: systemActor('test seed') }));
const user = (role: UserActor['role']) =>
	testCtx(db, { actor: { kind: 'user', id: 1, role, locale: null, timeZone: null } });
const { version } = JSON.parse(
	readFileSync(new URL('../../../../../package.json', import.meta.url), 'utf8')
);

describe('settings overview', () => {
	it('shows administrators the app version from package.json and the installed languages', () => {
		expect(getOverview(user('admin'))).toEqual({ version, languages: ['en', 'es'] });
	});

	it('Non-administrator is denied', () => {
		expect(() => getOverview(user('member'))).toThrow(Forbidden);
		expect(() => getOverview(testCtx(db))).toThrow(Forbidden);
	});
});
