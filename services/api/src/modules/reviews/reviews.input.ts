import { identifier, object } from '../accounts/accounts.input.js';
import { invalid, withReason } from '../jobs/jobs.input.js';
export type ReviewInput = { stars: number; body: string; asset_id?: string | null; expected_version?: number };
export function version(value: unknown): number {
 if (!Number.isSafeInteger(value) || Number(value) < 1) throw invalid('EXPECTED_VERSION_REQUIRED', 'expected_version');
 return value as number;
}
export function reviewInput(body: unknown, edit = false): ReviewInput {
 const v = object(body, ['stars', 'body', 'asset_id', ...(edit ? ['expected_version'] : [])]);
 if (!Number.isInteger(v.stars) || Number(v.stars) < 1 || Number(v.stars) > 5) throw invalid('REVIEW_STARS_INVALID', 'stars');
 if (v.body !== undefined && typeof v.body !== 'string') throw invalid('REVIEW_TEXT_INVALID', 'body');
 return { stars: v.stars as number, body: (v.body as string | undefined) ?? '',
  ...(v.asset_id === undefined ? {} : { asset_id: edit && v.asset_id === null ? null : withReason('REVIEW_PHOTO_INVALID', 'asset_id', () => identifier(v.asset_id)) }),
  ...(edit ? { expected_version: version(v.expected_version) } : {}) };
}
export function visibilityInput(body: unknown) {
 const v = object(body, ['expected_version', 'removed', 'reason']);
 if (typeof v.removed !== 'boolean') throw invalid('REVIEW_VISIBILITY_INVALID', 'removed');
 if (v.reason !== undefined && typeof v.reason !== 'string') throw invalid('REVIEW_VISIBILITY_REASON_INVALID', 'reason');
 return { expected_version: version(v.expected_version), removed: v.removed, reason: (v.reason as string | undefined) ?? '' };
}

export function replyInput(body: unknown) {
 const v=object(body,['expected_version','body']);
 if(typeof v.body!=='string'||!v.body.trim())throw invalid('REVIEW_REPLY_REQUIRED','body');
 return {expected_version:version(v.expected_version),body:v.body.trim()};
}
