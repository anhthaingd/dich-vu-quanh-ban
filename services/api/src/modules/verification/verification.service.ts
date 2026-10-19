import {BadRequestException,ConflictException,NotFoundException,ForbiddenException} from '@nestjs/common';
import type {Pool,PoolClient} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import {hasPermission,memberAccess} from '../jobs/jobs.access.js';
import {object,identifier,type PageInput} from '../accounts/accounts.input.js';
import {text} from '../moderation/moderation.input.js';
import {decisionHistory} from '../moderation/history.js';
import {Cursor} from '../../common/http/cursor.js';
export function verificationInput(body:unknown){const v=object(body,['document_asset_ids','details','previous_request_id','expected_version']),details=object(v.details,['kind','statement']);
 if(!['identity','business','professional'].includes(String(details.kind))||!Array.isArray(v.document_asset_ids)||!v.document_asset_ids.length||v.document_asset_ids.length>10||new Set(v.document_asset_ids).size!==v.document_asset_ids.length)throw new BadRequestException();
 if(v.previous_request_id!==undefined&&(!Number.isSafeInteger(v.expected_version)||Number(v.expected_version)<1)||v.previous_request_id===undefined&&v.expected_version!==undefined)throw new BadRequestException();
 return {document_asset_ids:v.document_asset_ids.map(identifier),details:{kind:String(details.kind),statement:text(details.statement)},previous_request_id:v.previous_request_id===undefined?undefined:identifier(v.previous_request_id),expected_version:v.expected_version as number|undefined};
}
export class VerificationService {
 private readonly tx:AccountTransaction;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly admin:AdminAuthService,private readonly cursor:Cursor){this.tx=new AccountTransaction(pool,auth);}
 private async access(db:PoolClient,id:string,user:string){this.admin.requireConfigured();const p=(await db.query('SELECT id,kind,name FROM partners WHERE id=$1 AND archived_at IS NULL FOR UPDATE',[id])).rows[0];if(!p)throw new NotFoundException();if(!hasPermission(await memberAccess(db,id,user),'profile.manage'))throw new ForbiddenException();return p;}
 private async dto(db:PoolClient,id:string){const r=(await db.query('SELECT * FROM verification_requests WHERE id=$1',[id])).rows[0];const assets=(await db.query('SELECT asset_id FROM verification_assets WHERE request_id=$1 ORDER BY asset_id',[id])).rows;return {id:r.id,partner_id:r.partner_id,kind:r.kind,details:JSON.parse(this.admin.secrets.decrypt(r.private_cipher)),state:r.state,reason:r.reason,version:r.version,created_at:r.created_at.toISOString(),document_asset_ids:assets.map(a=>a.asset_id),history:await decisionHistory(db,'verifications',id)};}
 submit(header:string|undefined,id:string,input:ReturnType<typeof verificationInput>,key:string){return this.tx.run(header,`verification.submit:${id}`,key,input,async(db,a)=>{
  const p=await this.access(db,id,a.user.id);if(input.details.kind==='business'&&p.kind!=='company')throw new BadRequestException();
  const last=(await db.query('SELECT id,state,version FROM verification_requests WHERE partner_id=$1 AND kind=$2 ORDER BY created_at DESC,id DESC LIMIT 1',[id,input.details.kind])).rows[0];
  if(last&&(last.state==='pending'||last.state==='approved'))throw new ConflictException({code:'STATE_CONFLICT'});
  if(last?(last.id!==input.previous_request_id||last.version!==input.expected_version):input.previous_request_id!==undefined)throw new ConflictException({code:'VERSION_CONFLICT'});
  for(const asset of [...input.document_asset_ids].sort())if(!(await db.query("SELECT 1 FROM assets WHERE id=$1 AND uploader_id=$2 AND purpose='verification' AND status='ready' FOR SHARE",[asset,a.user.id])).rowCount)throw new BadRequestException();
  const r=(await db.query('INSERT INTO verification_requests(partner_id,submitted_by,kind,private_cipher) VALUES($1,$2,$3,$4) RETURNING id',[id,a.user.id,input.details.kind,this.admin.secrets.encrypt(JSON.stringify(input.details))])).rows[0];
  for(const asset of input.document_asset_ids)await db.query('INSERT INTO verification_assets(request_id,asset_id) VALUES($1,$2)',[r.id,asset]);
  if(input.details.kind==='identity')await db.query("UPDATE partners SET verification_status='pending',version=version+1 WHERE id=$1",[id]);
  await db.query("INSERT INTO audit_events(actor_id,partner_id,action,resource_id,reason,details) VALUES($1,$2,'verification.submit',$3,'', '{}')",[a.user.id,id,r.id]);
  // Snapshot only the request ID: private declaration is encrypted at rest, not duplicated into idempotency JSON.
  return {id:r.id};
 },async(db,a)=>{await this.access(db,id,a.user.id);}).then(r=>this.readOne(header,id,r.id));}
 private async readOne(header:string|undefined,partner:string,id:string){return this.admin.transaction(header,async(db,a)=>{await this.access(db,partner,a.user.id);return this.dto(db,id);});}
 list(header:string|undefined,id:string,q:PageInput){return this.admin.transaction(header,async(db,a)=>{await this.access(db,id,a.user.id);const scope=`verification:${id}:${a.user.id}`,after=this.cursor.decode(q.cursor,scope);
  const {rows}=await db.query(`SELECT id,date_trunc('milliseconds',created_at) AS created_at FROM verification_requests WHERE partner_id=$1 AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($2::timestamptz,$3::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $4`,[id,after?.created_at??null,after?.id??null,q.limit+1]);const items=rows.slice(0,q.limit),last=items.at(-1);return {items:await Promise.all(items.map(r=>this.dto(db,r.id))),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
 });}
}
