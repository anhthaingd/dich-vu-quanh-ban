import {BadRequestException,ConflictException,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {createHmac,createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import type {Pool,PoolClient} from 'pg';
import type {IncomingMessage} from 'node:http';
import type {AuthService} from '../auth/auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import {object} from '../accounts/accounts.input.js';
import {hasPermission,memberAccess,jobAccess} from '../jobs/jobs.access.js';
export type LocalAssets={directory:string;origin:string};
const MAX_BYTES=10*1024*1024,TTL=10*60*1000;
export class AssetsService {
 private readonly tx:AccountTransaction;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly secret:string,private readonly config?:LocalAssets){this.tx=new AccountTransaction(pool,auth);}
 private configured(){if(!this.config)throw new ServiceUnavailableException();return this.config;}
 private sign(id:string,user:string,session:string,kind:string){const payload=Buffer.from(JSON.stringify({id,user,session,kind,expires:Date.now()+TTL})).toString('base64url');return payload+'.'+createHmac('sha256',this.secret).update('asset:'+payload).digest('base64url');}
 private async verify(id:string,token:unknown,kind:string){
  this.configured();if(typeof token!=='string'||token.length>2048)throw new NotFoundException();const [payload,signature,...rest]=token.split('.');
  const expected=createHmac('sha256',this.secret).update('asset:'+payload).digest('base64url');if(rest.length||!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new NotFoundException();
  let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString());}catch{throw new NotFoundException();}
  if(data.id!==id||(data.kind!==kind&&!(kind==='content'&&data.kind==='public-content'))||!Number.isFinite(data.expires)||data.expires<=Date.now())throw new NotFoundException();
  if(data.kind==='public-content')return {id:data.id,user:'',session:''};
  const {rows}=await this.pool.query("SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active'",[data.session,data.user]);if(!rows.length)throw new NotFoundException();return data as {id:string;user:string;session:string};
 }
 private url(id:string,user:string,session:string,kind:string){return this.configured().origin+'/v1/assets/'+id+'/'+(kind==='public-content'?'content':kind)+'?grant='+this.sign(id,user,session,kind);}
 grant(header:string|undefined,body:unknown,key:string){
  this.configured();const v=object(body,['purpose','mime','bytes','checksum']);if(!['result','review','evidence'].includes(String(v.purpose))||!['image/jpeg','image/png','image/webp'].includes(String(v.mime))||!Number.isSafeInteger(v.bytes)||Number(v.bytes)<1||Number(v.bytes)>MAX_BYTES||(v.checksum!==undefined&&(typeof v.checksum!=='string'||!/^[a-f0-9]{64}$/.test(v.checksum))))throw new BadRequestException();
  return this.tx.run(header,'assets.grant',key,v,async(db,actor)=>{
   const count=(await db.query("SELECT count(*) FROM assets WHERE uploader_id=$1 AND created_at>now()-interval '1 hour'",[actor.user.id])).rows[0].count;if(Number(count)>=100)throw new BadRequestException();
   const a=(await db.query("INSERT INTO assets(uploader_id,object_key,purpose,mime,bytes,status,checksum) VALUES($1,$2,$6,$3,$4,'pending',$5) RETURNING id",[actor.user.id,randomUUID(),v.mime,v.bytes,v.checksum??null,v.purpose])).rows[0];
   return {asset_id:a.id,upload_url:this.url(a.id,actor.user.id,actor.sessionId,'upload'),expires_at:new Date(Date.now()+TTL).toISOString(),required_headers:{'Content-Type':String(v.mime)}};
  });
 }
 async upload(id:string,grant:unknown,req:IncomingMessage){
  const actor=await this.verify(id,grant,'upload');let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_BYTES)throw new BadRequestException();chunks.push(Buffer.from(chunk));}const data=Buffer.concat(chunks),hash=createHash('sha256').update(data).digest('hex');
  const db=await this.pool.connect();try{await db.query('BEGIN');const a=(await db.query('SELECT * FROM assets WHERE id=$1 AND uploader_id=$2 FOR UPDATE',[id,actor.user])).rows[0];
   if(!a)throw new NotFoundException();if(a.status!=='pending')throw new ConflictException({code:'STATE_CONFLICT'});
   if(Number(a.bytes)!==size||req.headers['content-type']!==a.mime||(a.checksum&&a.checksum!==hash))throw new BadRequestException();
   if(a.uploaded_checksum&&a.uploaded_checksum!==hash)throw new ConflictException({code:'IDEMPOTENCY_MISMATCH'});
   const dir=this.configured().directory;await mkdir(dir,{recursive:true});const path=join(dir,a.object_key+'.raw');const temp=path+'.'+randomUUID();await writeFile(temp,data,{mode:0o600});await rename(temp,path);
   await db.query('UPDATE assets SET uploaded_checksum=$2 WHERE id=$1',[id,hash]);await db.query('COMMIT');return {uploaded:true};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 complete(header:string|undefined,id:string,key:string,body:unknown){
  this.configured();const input=object(body,['expected_version']);if(input.expected_version!==1)throw new BadRequestException();
  return this.tx.run(header,'assets.complete.'+id,key,input,async(db,actor)=>{
   const a=(await db.query('SELECT * FROM assets WHERE id=$1 AND uploader_id=$2 FOR UPDATE',[id,actor.user.id])).rows[0];if(!a)throw new NotFoundException();
   if(a.status==='ready')return this.dto(a,actor.user.id,actor.sessionId);
   if(a.status!=='pending'||!a.uploaded_checksum)throw new BadRequestException();
   let bytes:Buffer;try{
    const raw=await readFile(join(this.configured().directory,a.object_key+'.raw'));if(raw.length!==Number(a.bytes)||createHash('sha256').update(raw).digest('hex')!==a.uploaded_checksum)throw new Error('bytes');
    const image=sharp(raw,{limitInputPixels:25000000,failOn:'warning'}),meta=await image.metadata();if(({jpeg:'image/jpeg',png:'image/png',webp:'image/webp'} as Record<string,string>)[meta.format??'']!==a.mime||(meta.pages??1)>1)throw new Error('mime');
    bytes=await image.rotate().png().toBuffer();
   }catch{throw new BadRequestException();}
   const target=join(this.configured().directory,a.object_key+'.png');await writeFile(target,bytes,{mode:0o600});await db.query("UPDATE assets SET status='ready' WHERE id=$1",[id]);return this.dto({...a,status:'ready'},actor.user.id,actor.sessionId);
  },async(db,actor)=>{if(!(await db.query('SELECT 1 FROM assets WHERE id=$1 AND uploader_id=$2',[id,actor.user.id])).rows.length)throw new NotFoundException();});
 }
 private dto(a:{id:string;status:string},user:string,session:string){return {id:a.id,status:a.status,download_url:a.status==='ready'?this.url(a.id,user,session,'content'):null,expires_at:a.status==='ready'?new Date(Date.now()+TTL).toISOString():null};}
 private async authorized(db:PoolClient,id:string,user:string){
  const a=(await db.query('SELECT * FROM assets WHERE id=$1',[id])).rows[0];if(!a)throw new NotFoundException();
  if(a.purpose==='evidence'){if(a.uploader_id!==user)throw new NotFoundException();return a;}
  const reviews=(await db.query('SELECT j.id,j.partner_id,j.customer_id FROM reviews r JOIN jobs j ON j.id=r.job_id WHERE r.asset_id=$1',[id])).rows;
  if(reviews.length){
   for(const j of reviews){
    if(j.customer_id===user)return a;
    const member=await memberAccess(db,j.partner_id,user);
    if(member&&(member.is_owner||['jobs.manage','jobs.accept','jobs.assign','reviews.write','reviews.respond'].some(p=>hasPermission(member,p))||(await db.query('SELECT 1 FROM assignments WHERE job_id=$1 AND membership_id=$2 AND ended_at IS NULL',[j.id,member.id])).rowCount))return a;
   }
   return this.publicAsset(db,id);
  }
  // Unattached uploads belong to uploader; once attached, use current Job access.
  const jobs=(await db.query('SELECT DISTINCT i.job_id,v.sent_at FROM invoice_assets ia JOIN invoice_versions v ON v.id=ia.version_id JOIN invoices i ON i.id=v.invoice_id WHERE ia.asset_id=$1',[id])).rows;
  if(!jobs.length){if(a.uploader_id!==user)throw new NotFoundException();return a;}
  for(const j of jobs){try{const access=await jobAccess(db,j.job_id,user);if(!access.customer||j.sent_at)return a;}catch(e){if(!(e instanceof NotFoundException))throw e;}}
  throw new NotFoundException();
 }
 private async publicAsset(db:PoolClient,id:string) {
  const a=(await db.query(`SELECT a.* FROM assets a WHERE a.id=$1 AND a.purpose='review' AND a.status='ready' AND EXISTS (
   SELECT 1 FROM reviews r JOIN jobs j ON j.id=r.job_id JOIN partners p ON p.id=j.partner_id
   WHERE r.asset_id=a.id AND r.direction='customer_to_partner' AND r.hidden_at IS NULL AND r.removed_at IS NULL
   AND p.publication_status='published' AND p.moderation_status='active' AND p.archived_at IS NULL)`,[id])).rows[0];
  if(!a)throw new NotFoundException();return a;
 }
 async get(header:string|undefined,id:string){
  this.configured();
  if(header){const actor=await this.auth.authenticate(header);return this.withRead(id,actor.user.id,a=>this.dto(a,actor.user.id,actor.sessionId));}
  return this.withRead(id,'',a=>({id:a.id,status:a.status,download_url:this.url(a.id,'','','public-content'),expires_at:new Date(Date.now()+TTL).toISOString()}));
 }
 private async withRead<T>(id:string,user:string,read:(a: {id:string;status:string;object_key:string})=>Promise<T>|T){const db=await this.pool.connect();try{await db.query('BEGIN');const a=user?await this.authorized(db,id,user):await this.publicAsset(db,id);const r=await read(a);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}}
 async content(id:string,grant:unknown){const actor=await this.verify(id,grant,'content');return this.withRead(id,actor.user,async a=>{if(a.status!=='ready')throw new NotFoundException();return readFile(join(this.configured().directory,a.object_key+'.png'));});}
}
