import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import { AccountTransaction } from '../accounts/account-transaction.js';
import type { PageInput } from '../accounts/accounts.input.js';
import { hasPermission, memberAccess } from '../jobs/jobs.access.js';
import type { Cursor } from '../../common/http/cursor.js';
import type { ReviewInput, visibilityInput } from './reviews.input.js';

type ReviewRow = { id: string; job_id: string; direction: string; author_id: string; stars: number; body: string; asset_id: string | null; hidden_at: Date | null; removed_at: Date | null; version: number; created_at: Date };
function dto(r: ReviewRow) { return { id:r.id, job_id:r.job_id, direction:r.direction, author_id:r.author_id, stars:r.stars, body:r.body, hidden:!!r.hidden_at, removed:!!r.removed_at, version:r.version }; }
export class ReviewsService {
 private readonly tx: AccountTransaction;
 constructor(private readonly pool: Pool, private readonly auth: AuthService, private readonly cursor: Cursor) { this.tx = new AccountTransaction(pool, auth); }
 private async access(db: PoolClient, jobId: string, user: string, write = false) {
  const ref = (await db.query('SELECT partner_id FROM jobs WHERE id=$1', [jobId])).rows[0];
  if (!ref) throw new NotFoundException();
  // Match job/team mutations: partner before job, then current membership and grants.
  await db.query('SELECT id FROM partners WHERE id=$1 FOR UPDATE', [ref.partner_id]);
  const job = (await db.query('SELECT * FROM jobs WHERE id=$1 FOR UPDATE', [jobId])).rows[0];
  const member = await memberAccess(db, job.partner_id, user);
  const customer = job.customer_id === user;
  const assigned = !!member && !!(await db.query('SELECT 1 FROM assignments WHERE job_id=$1 AND membership_id=$2 AND ended_at IS NULL', [jobId, member.id])).rowCount;
  if (!customer && !assigned && !['jobs.manage','jobs.accept','jobs.assign','reviews.write','reviews.respond'].some(p => hasPermission(member,p))) throw new NotFoundException();
  if (write && !customer && !hasPermission(member,'reviews.write')) throw new ForbiddenException();
  return { job, customer };
 }
 private async eligible(db: PoolClient, jobId: string) {
  const { rowCount } = await db.query(`SELECT 1 FROM invoices i JOIN settlements s ON s.invoice_id=i.id
   WHERE i.job_id=$1 AND i.state='settled' AND i.customer_payment_reported_at IS NOT NULL AND i.worker_receipt_confirmed_at IS NOT NULL`, [jobId]);
  if (!rowCount) throw new ConflictException({code:'STATE_CONFLICT'});
 }
 private async row(db: PoolClient, id: string): Promise<ReviewRow> {
  const r = (await db.query('SELECT * FROM reviews WHERE id=$1', [id])).rows[0];
  if (!r) throw new NotFoundException();
  return r;
 }
 private async own(db: PoolClient, id: string, user: string) {
  const ref = await this.row(db,id);
  const a = await this.access(db,ref.job_id,user,true);
  const r = await this.row(db,id);
  if (r.author_id !== user) throw new ForbiddenException();
  return { ...a, r };
 }
 private async asset(db: PoolClient, id: string | undefined, user: string) {
  if (id && !(await db.query("SELECT 1 FROM assets WHERE id=$1 AND uploader_id=$2 AND purpose='review' AND status='ready' FOR SHARE",[id,user])).rowCount) throw new BadRequestException();
 }
 private async audit(db: PoolClient, user: string, partner: string, action: string, id: string, before: unknown, after: unknown, reason = '') {
  await db.query('INSERT INTO audit_events(actor_id,partner_id,action,resource_id,reason,details) VALUES($1,$2,$3,$4,$5,$6)',[user,partner,action,id,reason,JSON.stringify({before,after})]);
 }
 create(header: string | undefined, jobId: string, input: ReviewInput, key: string) {
  return this.tx.run(header,`createReview:${jobId}`,key,input,async(db,a)=>{
   const access = await this.access(db,jobId,a.user.id,true);
   await this.eligible(db,jobId); await this.asset(db,input.asset_id,a.user.id);
   const direction = access.customer ? 'customer_to_partner' : 'partner_to_customer';
   if ((await db.query('SELECT 1 FROM reviews WHERE job_id=$1 AND direction=$2',[jobId,direction])).rowCount) throw new ConflictException({code:'STATE_CONFLICT'});
   const r = (await db.query('INSERT INTO reviews(job_id,direction,author_id,stars,body,asset_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[jobId,direction,a.user.id,input.stars,input.body,input.asset_id??null])).rows[0];
   await this.audit(db,a.user.id,access.job.partner_id,'review.create',r.id,null,r); return dto(r);
  },async(db,a)=>{await this.access(db,jobId,a.user.id,true);});
 }
 edit(header: string | undefined, id: string, input: ReviewInput, key: string) {
  return this.tx.run(header,`editReview:${id}`,key,input,async(db,a)=>{
   const {r,job} = await this.own(db,id,a.user.id);
   if (r.version !== input.expected_version) throw new ConflictException({code:'VERSION_CONFLICT'});
   await this.asset(db,input.asset_id,a.user.id);
   const next = (await db.query('UPDATE reviews SET stars=$2,body=$3,asset_id=$4,version=version+1 WHERE id=$1 RETURNING *',[id,input.stars,input.body,input.asset_id??null])).rows[0];
   await this.audit(db,a.user.id,job.partner_id,'review.edit',id,r,next); return dto(next);
  },async(db,a)=>{await this.own(db,id,a.user.id);});
 }
 visibility(header: string | undefined, id: string, input: ReturnType<typeof visibilityInput>, key: string) {
  return this.tx.run(header,`toggleOwnReview:${id}`,key,input,async(db,a)=>{
   const {r,job} = await this.own(db,id,a.user.id);
   if (r.version !== input.expected_version) throw new ConflictException({code:'VERSION_CONFLICT'});
   const next = (await db.query('UPDATE reviews SET removed_at=CASE WHEN $2 THEN COALESCE(removed_at,now()) ELSE NULL END,version=version+1 WHERE id=$1 RETURNING *',[id,input.removed])).rows[0];
   await this.audit(db,a.user.id,job.partner_id,'review.visibility',id,r,next,input.reason); return dto(next);
  },async(db,a)=>{await this.own(db,id,a.user.id);});
 }
 async list(header: string | undefined, id: string, publicPartner: boolean, q: PageInput) {
  const db = await this.pool.connect();
  try {
   await db.query('BEGIN');
   let scope = `partnerReviews:${id}`;
   if (publicPartner) {
    if (!(await db.query("SELECT 1 FROM partners WHERE id=$1 AND publication_status='published' AND moderation_status='active' AND archived_at IS NULL",[id])).rowCount) throw new NotFoundException();
   } else {
    const a = await this.auth.authenticate(header,db); await this.access(db,id,a.user.id); scope = `jobReviews:${id}:${a.user.id}`;
   }
   const start = this.cursor.decode(q.cursor,scope);
   const {rows} = await db.query(`SELECT r.*,date_trunc('milliseconds',r.created_at) AS created_at FROM reviews r JOIN jobs j ON j.id=r.job_id
    WHERE ${publicPartner ? "j.partner_id=$1 AND r.direction='customer_to_partner' AND r.hidden_at IS NULL AND r.removed_at IS NULL" : 'r.job_id=$1'}
    AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',r.created_at),r.id)<($2::timestamptz,$3::uuid))
    ORDER BY date_trunc('milliseconds',r.created_at) DESC,r.id DESC LIMIT $4`,[id,start?.created_at??null,start?.id??null,q.limit+1]);
   const items = rows.slice(0,q.limit), last = items.at(-1);
   const result = {items:items.map(dto),next_cursor:rows.length>q.limit ? this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope) : null};
   await db.query('COMMIT'); return result;
  } catch(e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
 }
}
