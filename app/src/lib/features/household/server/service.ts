// The household, its member types and its members (spec household). Every function authorizes
// its action (ADR 0004) before touching data; names are unique by their key (design D1).
import type { Ctx } from '../../../server/core/ctx.ts';
import { Conflict, Invalid, NotFound } from '../../../server/core/errors.ts';
import { withTransaction } from '../../../server/core/transaction.ts';
import { parseInput } from '../../../server/core/validation.ts';
import { authorize, can } from '../../../server/policy/policy.ts';
import { hashNewPassword } from '../../auth/server/index.ts';
import { createAccount } from '../../users/server/index.ts';
import { newMemberAccount } from '../../users/validation.ts';
import {
	householdName,
	memberChanges,
	memberTypeChanges,
	nameKey,
	newMember,
	newMemberType
} from '../validation.ts';
import * as queries from './queries.ts';
import * as repo from './repo.ts';

export type MemberType = ReturnType<typeof repo.listMemberTypes>[number];
export type Member = ReturnType<typeof queries.listActiveMembers>[number];
export type MemberWithAccount = ReturnType<typeof queries.listMembersWithAccounts>[number];
export type UnlinkedAccount = ReturnType<typeof queries.listUnlinkedAccounts>[number];

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
	authorize(ctx.actor, 'memberTypes.manage');
	withTransaction(ctx, (tx) => {
		if (!repo.findMemberType(tx.db, id)) throw new NotFound();
		repo.updateMemberType(tx.db, id, { archivedAt: new Date() });
	});
}

export function unarchiveMemberType(ctx: Ctx, id: string): void {
	authorize(ctx.actor, 'memberTypes.manage');
	withTransaction(ctx, (tx) => {
		if (!repo.findMemberType(tx.db, id)) throw new NotFound();
		repo.updateMemberType(tx.db, id, { archivedAt: null });
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

/**
 * Active members for everyone; administrators also get archived members and each member's
 * account. Account fields are never selected for anyone else (spec household).
 */
export function listMembers(
	ctx: Ctx
):
	| { withAccounts: false; members: Member[] }
	| { withAccounts: true; members: MemberWithAccount[] } {
	authorize(ctx.actor, 'household.view');
	return can(ctx.actor, 'accounts.view') && can(ctx.actor, 'members.manage')
		? { withAccounts: true, members: queries.listMembersWithAccounts(ctx.db) }
		: { withAccounts: false, members: queries.listActiveMembers(ctx.db) };
}

/** One member with their account, for the administrators' member page. */
export function getMember(ctx: Ctx, id: string): MemberWithAccount {
	authorize(ctx.actor, 'members.manage');
	const member = queries.findMemberWithAccount(ctx.db, id);
	if (!member) throw new NotFound();
	return member;
}

/** A member type that can be given to a member: it exists and isn't archived. */
function assertChoosableType(ctx: Ctx, memberTypeId: string): void {
	const type = repo.findMemberType(ctx.db, memberTypeId);
	if (!type || type.archivedAt) {
		throw new Invalid([
			{ field: 'memberTypeId', key: 'household.member.type_unavailable', params: {} }
		]);
	}
}

/** Idempotent by ID (ADR 0007): the same ID with the same content succeeds once. */
export function createMember(ctx: Ctx, input: unknown): void {
	authorize(ctx.actor, 'members.manage');
	const member = parseInput(newMember, input);
	const key = nameKey(member.name);
	withTransaction(ctx, (tx) => {
		const existing = repo.findMember(tx.db, member.id);
		if (existing) {
			if (existing.nameKey === key && existing.memberTypeId === member.memberTypeId) return;
			throw new Conflict('household.id.conflict');
		}
		if (repo.findMemberByNameKey(tx.db, key)) throw new Conflict('household.name.taken');
		assertChoosableType(tx, member.memberTypeId);
		repo.insertMember(tx.db, { ...member, nameKey: key, createdAt: new Date() });
	});
}

/** Renames and changes the type; a new type must not be archived. */
export function updateMember(ctx: Ctx, id: string, input: unknown): void {
	authorize(ctx.actor, 'members.manage');
	const changes = parseInput(memberChanges, input);
	withTransaction(ctx, (tx) => {
		const member = repo.findMember(tx.db, id);
		if (!member) throw new NotFound();
		const key = changes.name === undefined ? undefined : nameKey(changes.name);
		if (key !== undefined && key !== member.nameKey && repo.findMemberByNameKey(tx.db, key)) {
			throw new Conflict('household.name.taken');
		}
		if (changes.memberTypeId !== undefined && changes.memberTypeId !== member.memberTypeId) {
			assertChoosableType(tx, changes.memberTypeId);
		}
		repo.updateMember(tx.db, id, { ...changes, ...(key && { nameKey: key }) });
	});
}

/** Refused while the member is linked to an active account (spec household). */
export function archiveMember(ctx: Ctx, id: string): void {
	authorize(ctx.actor, 'members.manage');
	withTransaction(ctx, (tx) => {
		const member = queries.findMemberWithAccount(tx.db, id);
		if (!member) throw new NotFound();
		if (member.account?.active) throw new Conflict('household.member.active_account');
		repo.updateMember(tx.db, id, { archivedAt: new Date() });
	});
}

export function unarchiveMember(ctx: Ctx, id: string): void {
	authorize(ctx.actor, 'members.manage');
	withTransaction(ctx, (tx) => {
		if (!repo.findMember(tx.db, id)) throw new NotFound();
		repo.updateMember(tx.db, id, { archivedAt: null });
	});
}

/** Only a member never linked to an account; any other is archived instead. */
export function deleteMember(ctx: Ctx, id: string): void {
	authorize(ctx.actor, 'members.manage');
	withTransaction(ctx, (tx) => {
		const member = repo.findMember(tx.db, id);
		if (!member) throw new NotFound();
		if (member.firstLinkedAt) throw new Conflict('household.member.ever_linked');
		repo.deleteMember(tx.db, id);
	});
}

/** Accounts an administrator may link to a member. */
export function listUnlinkedAccounts(ctx: Ctx): UnlinkedAccount[] {
	authorize(ctx.actor, 'accounts.view');
	return queries.listUnlinkedAccounts(ctx.db);
}

function link(ctx: Ctx, memberId: string, userId: number): void {
	const member = repo.findMember(ctx.db, memberId);
	if (!member) throw new NotFound();
	if (member.userId !== null) throw new Conflict('household.member.has_account');
	if (queries.memberOfAccount(ctx.db, userId)) throw new Conflict('household.account.linked');
	repo.updateMember(ctx.db, memberId, {
		userId,
		// Never cleared: a member ever linked is archived, not deleted.
		firstLinkedAt: member.firstLinkedAt ?? new Date()
	});
}

/**
 * An account for a member that has none (ADR 0026): created and linked together, or not at all.
 * The password is hashed first, outside the transaction (ADR 0002).
 */
export async function createAccountForMember(
	ctx: Ctx,
	memberId: string,
	input: unknown
): Promise<void> {
	authorize(ctx.actor, 'accounts.create');
	authorize(ctx.actor, 'members.manage');
	const account = parseInput(newMemberAccount, input);
	const passwordHash = await hashNewPassword({ password: account.password });
	withTransaction(ctx, (tx) => {
		const member = repo.findMember(tx.db, memberId);
		if (!member) throw new NotFound();
		if (member.userId !== null) throw new Conflict('household.member.has_account');
		const userId = createAccount(tx, { ...account, passwordHash });
		link(tx, memberId, userId);
	});
}

/** Links an account with no member to a member with no account. */
export function linkAccount(ctx: Ctx, memberId: string, userId: number): void {
	authorize(ctx.actor, 'members.manage');
	withTransaction(ctx, (tx) => {
		if (!queries.accountExists(tx.db, userId)) throw new NotFound();
		link(tx, memberId, userId);
	});
}

/** The account keeps existing and signing in; it can be linked again. */
export function unlinkAccount(ctx: Ctx, memberId: string): void {
	authorize(ctx.actor, 'members.manage');
	withTransaction(ctx, (tx) => {
		if (!repo.findMember(tx.db, memberId)) throw new NotFound();
		repo.updateMember(tx.db, memberId, { userId: null });
	});
}
