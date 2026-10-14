export type MyMembership={id:string;partner_id:string;partner_name:string;partner_kind:'solo'|'shop'|'company';is_owner:boolean;active:boolean;permissions:string[];version:number;left_at:string|null};
export type Invitation={id:string;partner_id:string;contact_masked:string;permissions:string[];status:'pending'|'accepted'|'expired'|'revoked'|'replaced';created_at:string;expires_at:string;version:number;replacement_id:string|null;delivery_state:'queued'|'submitted'|'failed'|'unknown'};
export type Departure={membership_version:number;total:number;items:{id:string;state:string;version:number}[];next_cursor:string|null};
export type Ack={id:string;version:number;state:string};
export type Challenge={id:string;expires_at:string;resend_after_seconds:number};
export const teamPermissions=['jobs.accept','jobs.assign','jobs.manage','profile.manage','members.manage','wallet.read','wallet.topup','wallet.withdraw','bank.manage','reviews.respond','reviews.write'] as const;

export const permissionKeys = {
 'jobs.accept': 'team.permission_jobs_accept',
 'jobs.assign': 'team.permission_jobs_assign',
 'jobs.manage': 'team.permission_jobs_manage',
 'profile.manage': 'team.permission_profile_manage',
 'members.manage': 'team.permission_members_manage',
 'wallet.read': 'team.permission_wallet_read',
 'wallet.topup': 'team.permission_wallet_topup',
 'wallet.withdraw': 'team.permission_wallet_withdraw',
 'bank.manage': 'team.permission_bank_manage',
 'reviews.respond': 'team.permission_reviews_respond',
 'reviews.write': 'team.permission_reviews_write',
} as const;
