// The household, its member types and its members (spec household). Every function authorizes
// its action (ADR 0004) before touching data; names are unique by their key (design D1).
import type { Ctx } from '../../../server/core/ctx.ts';
import { Conflict, NotFound } from '../../../server/core/errors.ts';
import { withTransaction } from '../../../server/core/transaction.ts';
import { parseInput } from '../../../server/core/validation.ts';
import { authorize, can } from '../../../server/policy/policy.ts';
import { householdName, memberTypeChanges, nameKey, newMemberType } from '../validation.ts';
import * as repo from './repo.ts';

export type MemberType = ReturnType<typeof repo.listMemberTypes>[number];

/** The household name; null while nobody has named it. */
export function getHousehold(ctx: Ctx): { name: string | null } {
	authorize(ctx.actor, 'household.view');
	return { name: repo.findHouseholdName(ctx.db) };
}

export function renameHousehold(ctx: Ctx, input: unknown): void {
	authorize(ctx.actor, 'household.update');
	const { name } = parseInput(householdName, input);
	withTransaction(ctx, (tx) => repo.saveHouseholdName(tx.db, name, new Date()));
}

/** Administrators see archived types too; everyone else, only the ones members can be given. */
export function listMemberTypes(ctx: Ctx): MemberType[] {
	authorize(ctx.actor, 'household.view');
	const types = repo.listMemberTypes(ctx.db);
	return can(ctx.actor, 'memberTypes.manage') ? types : types.filter((type) => !type.archived);
}

/** Idempotent by ID (ADR 0007): the same ID with the same content succeeds once. */
export function createMemberType(ctx: Ctx, input: unknown): void {
	authorize(ctx.actor, 'memberTypes.manage');
	const type = parseInput(newMemberType, input);
	const key = nameKey(type.name);
	withTransaction(ctx, (tx) => {
		const existing = repo.findMemberType(tx.db, type.id);
		if (existing) {
			if (existing.nameKey === key && existing.baseClass === type.baseClass) return;
			throw new Conflict('household.id.conflict');
		}
		if (repo.findMemberTypeByNameKey(tx.db, key)) throw new Conflict('household.name.taken');
		repo.insertMemberType(tx.db, { ...type, nameKey: key, createdAt: new Date() });
	});
}

/** Renames, and changes the base class while no member has ever had the type. */
export function updateMemberType(ctx: Ctx, id: string, input: unknown): void {
	authorize(ctx.actor, 'memberTypes.manage');
	const changes = parseInput(memberTypeChanges, input);
	withTransaction(ctx, (tx) => {
		const type = repo.findMemberType(tx.db, id);
		if (!type) throw new NotFound();
		const key = changes.name === undefined ? undefined : nameKey(changes.name);
		if (key !== undefined && key !== type.nameKey && repo.findMemberTypeByNameKey(tx.db, key)) {
			throw new Conflict('household.name.taken');
		}
		if (
			changes.baseClass !== undefined &&
			changes.baseClass !== type.baseClass &&
			repo.memberTypeInUse(tx.db, id)
		) {
			throw new Conflict('household.member_type.base_class_in_use');
		}
		repo.updateMemberType(tx.db, id, { ...changes, ...(key && { nameKey: key }) });
	});
}

export function archiveMemberType(ctx: Ctx, id: string): void {
	setMemberTypeArchived(ctx, id, new Date());
}

export function unarchiveMemberType(ctx: Ctx, id: string): void {
	setMemberTypeArchived(ctx, id, null);
}

function setMemberTypeArchived(ctx: Ctx, id: string, archivedAt: Date | null): void {
	authorize(ctx.actor, 'memberTypes.manage');
	withTransaction(ctx, (tx) => {
		if (!repo.findMemberType(tx.db, id)) throw new NotFound();
		repo.updateMemberType(tx.db, id, { archivedAt });
	});
}

/** Only a type no member has ever had; one in use is archived instead. */
export function deleteMemberType(ctx: Ctx, id: string): void {
	authorize(ctx.actor, 'memberTypes.manage');
	withTransaction(ctx, (tx) => {
		if (!repo.findMemberType(tx.db, id)) throw new NotFound();
		if (repo.memberTypeInUse(tx.db, id)) throw new Conflict('household.member_type.in_use');
		repo.deleteMemberType(tx.db, id);
	});
}
