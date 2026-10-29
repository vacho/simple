// The household service against a migrated database, called as each kind of actor.
import { v7 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { anonymous, type UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Conflict, Forbidden, Invalid, NotFound } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { members } from './schema.ts';
import {
	archiveMemberType,
	createMemberType,
	deleteMemberType,
	getHousehold,
	listMemberTypes,
	renameHousehold,
	unarchiveMemberType,
	updateMemberType
} from './service.ts';

const db = createTestDatabase();
const user = (role: UserActor['role'], id: number): UserActor => ({
	kind: 'user',
	id,
	role,
	locale: null,
	timeZone: null,
	passwordTemporary: false
});
const admin = testCtx(db, { actor: user('admin', 1) });
const member = testCtx(db, { actor: user('member', 2) });
const visitor = testCtx(db, { actor: anonymous });

/** A member row with the type, written directly: members have their own tests. */
const giveTypeToMember = (memberTypeId: string, archived = false) => {
	const id = v7();
	db.insert(members)
		.values({
			id,
			name: id,
			nameKey: id,
			memberTypeId,
			archivedAt: archived ? new Date() : null,
			createdAt: new Date()
		})
		.run();
};
const newType = (name: string, baseClass = 'adult') => {
	const id = v7();
	createMemberType(admin, { id, name, baseClass });
	return id;
};
const typeNamed = (name: string) => listMemberTypes(admin).find((type) => type.name === name);

describe('Household name', () => {
	it('Unnamed household after setup: no name until an administrator sets one', () => {
		expect(getHousehold(member)).toEqual({ name: null });
	});

	it('Administrator names the household: trimmed, and every signed-in user sees it', () => {
		renameHousehold(admin, { name: '  Familia Pérez ' });
		expect(getHousehold(member)).toEqual({ name: 'Familia Pérez' });
		renameHousehold(admin, { name: 'Los Pérez' });
		expect(getHousehold(admin)).toEqual({ name: 'Los Pérez' });
	});

	it('Invalid household name: rejected, and the previous name stays', () => {
		for (const name of ['   ', 'x'.repeat(65), 'Bad\u0000name']) {
			expect(() => renameHousehold(admin, { name })).toThrow(Invalid);
		}
		expect(getHousehold(admin)).toEqual({ name: 'Los Pérez' });
	});

	it('Member cannot rename the household: denied, and the name does not change', () => {
		expect(() => renameHousehold(member, { name: 'Ours' })).toThrow(Forbidden);
		expect(getHousehold(admin)).toEqual({ name: 'Los Pérez' });
	});

	it('visitors cannot see it', () => {
		expect(() => getHousehold(visitor)).toThrow(Forbidden);
	});
});

describe('Member types catalog', () => {
	it('No member types after setup: the catalog starts empty', () => {
		expect(listMemberTypes(admin)).toEqual([]);
	});

	it('Create a member type: "Abuela" with the base class adult', () => {
		newType('Abuela', 'adult');
		expect(typeNamed('Abuela')).toMatchObject({
			baseClass: 'adult',
			archived: false,
			activeMembers: 0,
			inUse: false
		});
		expect(listMemberTypes(member).map((type) => type.name)).toContain('Abuela');
	});

	it('Duplicate member type name: "son" after "Son", by creation or rename', () => {
		newType('Son', 'minor');
		expect(() => newType('son')).toThrow(Conflict);
		const other = newType('Nephew', 'minor');
		expect(() => updateMemberType(admin, other, { name: ' SON ' })).toThrow(Conflict);
	});

	it('Duplicate member type submission: the same ID and content twice is one type', () => {
		const id = v7();
		createMemberType(admin, { id, name: 'Tía', baseClass: 'adult' });
		createMemberType(admin, { id, name: 'Tía', baseClass: 'adult' });
		expect(listMemberTypes(admin).filter((type) => type.name === 'Tía')).toHaveLength(1);
	});

	it('Conflicting member type submission: the same ID with other content is rejected', () => {
		const id = v7();
		createMemberType(admin, { id, name: 'Tío', baseClass: 'adult' });
		expect(() => createMemberType(admin, { id, name: 'Tío', baseClass: 'minor' })).toThrow(
			Conflict
		);
		expect(() => createMemberType(admin, { id, name: 'Primo', baseClass: 'adult' })).toThrow(
			Conflict
		);
		expect(typeNamed('Tío')).toMatchObject({ baseClass: 'adult' });
		expect(typeNamed('Primo')).toBeUndefined();
	});

	it('members and visitors cannot manage member types', () => {
		const id = newType('Padrino');
		for (const ctx of [member, visitor]) {
			expect(() => createMemberType(ctx, { id: v7(), name: 'X', baseClass: 'adult' })).toThrow(
				Forbidden
			);
			expect(() => updateMemberType(ctx, id, { name: 'Y' })).toThrow(Forbidden);
			expect(() => archiveMemberType(ctx, id)).toThrow(Forbidden);
			expect(() => unarchiveMemberType(ctx, id)).toThrow(Forbidden);
			expect(() => deleteMemberType(ctx, id)).toThrow(Forbidden);
		}
		expect(() => listMemberTypes(visitor)).toThrow(Forbidden);
	});

	it('a missing type is not found', () => {
		expect(() => updateMemberType(admin, v7(), { name: 'Z' })).toThrow(NotFound);
		expect(() => deleteMemberType(admin, v7())).toThrow(NotFound);
	});
});

describe('Base class decides, not the name', () => {
	it('Rename a used member type: the member shows the new name', () => {
		const id = newType('Hijo', 'minor');
		giveTypeToMember(id);
		updateMemberType(admin, id, { name: 'Hijo mayor' });
		expect(typeNamed('Hijo mayor')).toMatchObject({ id, activeMembers: 1 });
	});

	it('Base class immutable after first use: refused, it stays minor', () => {
		const id = typeNamed('Hijo mayor')!.id;
		expect(() => updateMemberType(admin, id, { baseClass: 'adult' })).toThrow(
			new Conflict('household.member_type.base_class_in_use')
		);
		expect(typeNamed('Hijo mayor')).toMatchObject({ baseClass: 'minor' });
	});

	it('the base class stays immutable when only archived members have the type', () => {
		const id = newType('Ahijado', 'minor');
		giveTypeToMember(id, true);
		expect(() => updateMemberType(admin, id, { baseClass: 'adult' })).toThrow(Conflict);
		expect(typeNamed('Ahijado')).toMatchObject({ activeMembers: 0, inUse: true });
	});

	it('Base class editable before first use: "Sobrino" from minor to dependent', () => {
		const id = newType('Sobrino', 'minor');
		updateMemberType(admin, id, { baseClass: 'dependent' });
		expect(typeNamed('Sobrino')).toMatchObject({ baseClass: 'dependent' });
	});
});

describe('Archiving member types', () => {
	it('Archive a used member type: hidden from members, kept by the member that has it', () => {
		const id = newType('Sobrino dependiente', 'dependent');
		giveTypeToMember(id);
		archiveMemberType(admin, id);
		expect(typeNamed('Sobrino dependiente')).toMatchObject({ archived: true, activeMembers: 1 });
		expect(listMemberTypes(member).map((type) => type.name)).not.toContain('Sobrino dependiente');
	});

	it('Used member type cannot be deleted: refused, explained as in use', () => {
		const id = typeNamed('Sobrino dependiente')!.id;
		expect(() => deleteMemberType(admin, id)).toThrow(new Conflict('household.member_type.in_use'));
		expect(typeNamed('Sobrino dependiente')).toBeDefined();
	});

	it('Delete an unused member type: it no longer exists', () => {
		const id = newType('Vecino');
		deleteMemberType(admin, id);
		expect(typeNamed('Vecino')).toBeUndefined();
	});

	it('Unarchive a member type: offered again', () => {
		const id = typeNamed('Sobrino dependiente')!.id;
		unarchiveMemberType(admin, id);
		expect(listMemberTypes(member).map((type) => type.name)).toContain('Sobrino dependiente');
	});
});
