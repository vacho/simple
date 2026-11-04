// Starts the production build as its own process, on a temporary database prepared through the
// app's own services (they are framework-free, ADR 0008), so each test controls its installation.
import { test as base, type Locator, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setup, signIn } from '../../src/lib/features/auth/server/index.ts';
import { hashPassword } from '../../src/lib/features/auth/server/password.ts';
import { users } from '../../src/lib/server/db/schema.ts';
import { updateProfile } from '../../src/lib/features/users/server/index.ts';
import { resolveActor } from '../../src/lib/features/auth/server/index.ts';
import { testCtx } from '../../src/lib/server/core/ctx.ts';
import type { Db } from '../../src/lib/server/db/client.ts';
import { startup } from '../../src/lib/server/startup.ts';

export const appRoot = path.resolve(import.meta.dirname, '../..');

/** What a TLS-terminating proxy would send; the apps started here trust it (PROTOCOL_HEADER). */
export const proxyHeaders = { 'x-forwarded-proto': 'http' };

export interface App {
	url: string;
	databasePath: string;
	output: () => string;
	exited: Promise<number | null>;
	listening: Promise<void>;
	stop: () => Promise<void>;
}

let nextPort = 4300 + Number(process.env.TEST_PARALLEL_INDEX ?? 0) * 100;

const running = new Set<App>();

/** Playwright's test, stopping every app a test started after it, even when the test fails. */
export const test = base.extend<{ stopApps: void }>({
	stopApps: [
		// eslint-disable-next-line no-empty-pattern -- Playwright fixtures destructure their dependencies.
		async ({}, use) => {
			await use();
			await Promise.all([...running].map((app) => app.stop()));
		},
		{ auto: true }
	]
});
export { expect } from '@playwright/test';

export function newDatabasePath(): string {
	return path.join(mkdtempSync(path.join(tmpdir(), 'simple-e2e-app-')), 'app.db');
}

/** Opens the database as the app does at startup, runs prepare, and closes it. */
export async function prepareDatabase<T>(
	databasePath: string,
	prepare: (db: Db) => Promise<T> | T
) {
	const db = startup({
		databasePath,
		backupDir: path.join(path.dirname(databasePath), 'backups'),
		version: '0.0.0-test'
	});
	try {
		return await prepare(db);
	} finally {
		db.$client.close();
	}
}

export function startApp(databasePath: string, env: Record<string, string> = {}): App {
	const port = nextPort++;
	const server = spawn('node', ['build'], {
		cwd: appRoot,
		env: {
			...process.env,
			// npm run test:e2e:pseudo starts every app with the pseudo-locale.
			I18N_PSEUDO: process.env.I18N_PSEUDO ?? '',
			PORT: String(port),
			// adapter-node assumes https unless a proxy header says otherwise: the tests act as that
			// proxy, sending proxyHeaders, so each app can run on its own port over plain http.
			PROTOCOL_HEADER: 'x-forwarded-proto',
			DATABASE_PATH: databasePath,
			...env
		}
	});
	let output = '';
	server.stdout.on('data', (chunk) => (output += chunk));
	server.stderr.on('data', (chunk) => (output += chunk));
	const exited = new Promise<number | null>((resolve) => server.on('exit', resolve));
	const listening = new Promise<void>((resolve, reject) => {
		server.stdout.on('data', () => output.includes('Listening') && resolve());
		exited.then((code) =>
			reject(new Error(`The app exited (${code}) before listening:\n${output}`))
		);
	});
	// A test expecting startup to fail awaits exited instead; don't report this rejection twice.
	listening.catch(() => {});
	let stopped: Promise<void> | undefined;
	const app: App = {
		url: `http://localhost:${port}`,
		databasePath,
		output: () => output,
		exited,
		listening,
		stop: () =>
			(stopped ??= (async () => {
				running.delete(app);
				server.kill();
				await exited;
				rmSync(path.dirname(databasePath), { recursive: true, force: true });
			})())
	};
	running.add(app);
	return app;
}

export interface Admin {
	token: string;
	userId: number;
}

/** Runs first-run setup through the auth service, as the setup page would. */
export async function setUpAdmin(db: Db, profile: { locale?: string | null } = {}): Promise<Admin> {
	const { token } = await setup(testCtx(db), {
		displayName: 'Ana Pérez',
		username: 'ana',
		password: 'correct horse battery'
	});
	const actor = resolveActor(testCtx(db), token).actor;
	if (actor.kind !== 'user') throw new Error('setup did not sign in');
	if (profile.locale !== undefined) updateProfile(testCtx(db, { actor }), actor.id, profile);
	return { token, userId: actor.id };
}

export const memberPassword = 'member password';

/**
 * A member account, signed in. The row is written directly, so tests of other features don't
 * depend on the account pages; the session comes from the real sign-in.
 */
export async function addMember(
	db: Db,
	username = 'luis',
	{ passwordTemporary = false } = {}
): Promise<string> {
	const password = memberPassword;
	db.insert(users)
		.values({
			username,
			displayName: 'Luis',
			passwordHash: await hashPassword(password),
			role: 'member',
			passwordTemporary,
			createdAt: new Date()
		})
		.run();
	const { token } = await signIn(testCtx(db), { username, password, address: '127.0.0.1' });
	return token;
}

/** An app with the administrator set up, and their session cookie. */
export async function startSetUpApp(profile: { locale?: string | null } = {}) {
	const databasePath = newDatabasePath();
	const admin = await prepareDatabase(databasePath, (db) => setUpAdmin(db, profile));
	const app = startApp(databasePath);
	await app.listening;
	return { app, admin, cookie: `session=${admin.token}` };
}

/**
 * Opens a page and waits until SvelteKit has hydrated it. WebKit reports the router's own history
 * update during hydration as a navigation, which would interrupt a navigation started too early.
 */
export async function open(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await page.waitForLoadState('networkidle');
}

/** Picks an option in a select (an Ark UI listbox) found by its label, inside `scope`. */
export async function choose(
	page: Page,
	label: string,
	option: string,
	scope: Page | Locator = page
): Promise<void> {
	await scope.getByRole('combobox', { name: label, exact: true }).click();
	await page.getByRole('option', { name: option, exact: true }).click();
}

/**
 * Submits a native or enhanced form and waits until the page it leads to has loaded: after an
 * enhanced success or redirect, SvelteKit loads the new data itself, after the POST answers.
 */
export async function submitAndWait(page: Page, button: Locator): Promise<void> {
	const posted = page.waitForResponse((response) => response.request().method() === 'POST');
	const reloaded = page.waitForResponse((response) => response.url().includes('/__data.json'));
	const navigated = page.waitForEvent('framenavigated');
	for (const pending of [reloaded, navigated]) pending.catch(() => {});
	await button.click();
	const response = await posted;
	if (response.headers()['content-type']?.includes('application/json')) {
		const { type } = (await response.json()) as { type: string };
		if (type === 'success' || type === 'redirect') await reloaded;
		if (type === 'redirect') await navigated;
	}
	await page.waitForLoadState('networkidle');
}
