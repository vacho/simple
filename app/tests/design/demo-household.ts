// The demo household (ADR 0030): made-up people and names for designs, captures and design tools,
// so nothing from the household's real instance ever reaches them. Built through the app's own
// services, like the end-to-end tests (tests/e2e/app.ts), so it is always a valid installation.
import { v7 } from 'uuid';
import { resolveActor, setup } from '../../src/lib/features/auth/server/index.ts';
import {
	archiveMember,
	createAccountForMember,
	createMember,
	createMemberType,
	renameHousehold
} from '../../src/lib/features/household/server/index.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import type { Db } from '../../src/lib/server/db/client.ts';

/** Sign-in of the demo administrator. Fictitious, for local demo databases only. */
export const demoAdmin = {
	displayName: 'Marta Rivera',
	username: 'marta',
	password: 'demo household 2026'
};

/** IDs of the members the captures open. */
export interface DemoHousehold {
	adminToken: string;
	memberWithAccount: string;
	memberWithoutAccount: string;
}

export async function seedDemoHousehold(db: Db): Promise<DemoHousehold> {
	const { token } = await setup(testCtx(db), demoAdmin);
	const actor = resolveActor(testCtx(db), token).actor;
	if (actor.kind !== 'user') throw new Error('setup did not sign in');
	const ctx = testCtx(db, { actor });

	renameHousehold(ctx, { name: 'Rivera household' });
	const [adult, child, grandparent] = [v7(), v7(), v7()];
	createMemberType(ctx, { id: adult, name: 'Parent', baseClass: 'adult' });
	createMemberType(ctx, { id: child, name: 'Child', baseClass: 'minor' });
	createMemberType(ctx, { id: grandparent, name: 'Grandparent', baseClass: 'dependent' });

	const marta = v7();
	const jorge = v7();
	const sofia = v7();
	const uncle = v7();
	createMember(ctx, { id: marta, name: 'Marta', memberTypeId: adult });
	createMember(ctx, { id: jorge, name: 'Jorge', memberTypeId: adult });
	createMember(ctx, { id: sofia, name: 'Sofía', memberTypeId: child });
	createMember(ctx, { id: v7(), name: 'Grandma Rosa', memberTypeId: grandparent });
	createMember(ctx, { id: uncle, name: 'Uncle Pablo', memberTypeId: adult });
	archiveMember(ctx, uncle);

	await createAccountForMember(ctx, jorge, {
		displayName: 'Jorge Rivera',
		username: 'jorge',
		role: 'member',
		password: 'demo household 2026'
	});

	return { adminToken: token, memberWithAccount: jorge, memberWithoutAccount: sofia };
}
