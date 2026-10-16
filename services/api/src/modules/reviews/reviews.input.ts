import { BadRequestException } from '@nestjs/common';
import { identifier, object } from '../accounts/accounts.input.js';
export type ReviewInput = { stars: number; body: string; asset_id?: string | null; expected_version?: number };
export function version(value: unknown): number {
 if (!Number.isSafeInteger(value) || Number(value) < 1) throw new BadRequestException();
 return value as number;
}
export function reviewInput(body: unknown, edit = false): ReviewInput {
 const v = object(body, ['stars', 'body', 'asset_id', ...(edit ? ['expected_version'] : [])]);
 if (!Number.isInteger(v.stars) || Number(v.stars) < 1 || Number(v.stars) > 5 || (v.body !== undefined && typeof v.body !== 'string')) throw new BadRequestException();
 return { stars: v.stars as number, body: (v.body as string | undefined) ?? '',
  ...(v.asset_id === undefined ? {} : { asset_id: edit && v.asset_id === null ? null : identifier(v.asset_id) }),
  ...(edit ? { expected_version: version(v.expected_version) } : {}) };
}
export function visibilityInput(body: unknown) {
 const v = object(body, ['expected_version', 'removed', 'reason']);
 if (typeof v.removed !== 'boolean' || (v.reason !== undefined && typeof v.reason !== 'string')) throw new BadRequestException();
 return { expected_version: version(v.expected_version), removed: v.removed, reason: (v.reason as string | undefined) ?? '' };
}

export function replyInput(body: unknown) {
 const v=object(body,['expected_version','body']);
 if(typeof v.body!=='string'||!v.body.trim())throw new BadRequestException();
 return {expected_version:version(v.expected_version),body:v.body.trim()};
}
