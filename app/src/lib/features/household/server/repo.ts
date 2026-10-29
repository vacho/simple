// All writes to the household, member_types and members tables, and their simple lookups.
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../../server/db/client.ts';
import { household, members, memberTypes } from './schema.ts';

type NewMemberType = typeof memberTypes.$inferInsert;

export function findHouseholdName(db: Db): string | null {
	return db.select({ name: household.name }).from(household).get()?.name ?? null;
}

export function saveHouseholdName(db: Db, name: string, now: Date): void {
	db.insert(household)
		.values({ id: 1, name, updatedAt: now })
		.onConflictDoUpdate({ target: household.id, set: { name, updatedAt: now } })
		.run();
}

export function findMemberType(db: Db, id: string) {
	return db.select().from(memberTypes).where(eq(memberTypes.id, id)).get();
}

/** The type holding this name key, if any. */
export function findMemberTypeByNameKey(db: Db, nameKey: string) {
	return db.select().from(memberTypes).where(eq(memberTypes.nameKey, nameKey)).get();
}

export function insertMemberType(db: Db, row: NewMemberType): void {
	db.insert(memberTypes).values(row).run();
}

export function updateMemberType(
	db: Db,
	id: string,
	changes: Partial<Pick<NewMemberType, 'name' | 'nameKey' | 'baseClass' | 'archivedAt'>>
): void {
	db.update(memberTypes).set(changes).where(eq(memberTypes.id, id)).run();
}

export function deleteMemberType(db: Db, id: string): void {
	db.delete(memberTypes).where(eq(memberTypes.id, id)).run();
}

/** Whether any member, archived or not, has the type: it is then "in use" (spec household). */
export function memberTypeInUse(db: Db, id: string): boolean {
	return (
		db.select({ id: members.id }).from(members).where(eq(members.memberTypeId, id)).get() !==
		undefined
	);
}

/** Every type with its number of active members and whether any member has it. */
export function listMemberTypes(db: Db) {
	return db
		.select({
			id: memberTypes.id,
			name: memberTypes.name,
			baseClass: memberTypes.baseClass,
			archived: sql<boolean>`${memberTypes.archivedAt} IS NOT NULL`.mapWith(Boolean),
			activeMembers:
				sql<number>`count(case when ${members.archivedAt} is null then ${members.id} end)`.mapWith(
					Number
				),
			inUse: sql<boolean>`count(${members.id}) > 0`.mapWith(Boolean)
		})
		.from(memberTypes)
		.leftJoin(members, eq(members.memberTypeId, memberTypes.id))
		.groupBy(memberTypes.id)
		.orderBy(memberTypes.nameKey)
		.all();
}
