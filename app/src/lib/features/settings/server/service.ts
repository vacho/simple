// The administrators' settings page, a placeholder in this change; later changes add members,
// roles, languages and catalogs to it.
import type { Ctx } from '../../../server/core/ctx.ts';
import { authorize } from '../../../server/policy/policy.ts';
import { listInstalled } from '../../languages/server/index.ts';

export interface Overview {
	version: string;
	languages: string[];
}

export function getOverview(ctx: Ctx): Overview {
	authorize(ctx.actor, 'settings.view');
	return { version: __APP_VERSION__, languages: listInstalled(ctx) };
}
