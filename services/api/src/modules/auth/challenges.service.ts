import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { randomInt, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AuthService } from './auth.service.js';
import type { LocalMessages } from '../../integrations/local-messages.js';
import { verifyPassword } from './password.js';
import type { challengeInput, verifyInput } from './challenge.input.js';
type Actor=Awaited<ReturnType<AuthService['authenticate']>>;
export class ChallengesService {
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly messages:LocalMessages){}
 private async tx<T>(header:string|undefined,work:(db:PoolClient,a:Actor,family:string)=>Promise<T>) {
  const initial=await this.auth.authenticate(header),db=await this.pool.connect();
  try {
   await db.query('BEGIN'); await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[initial.user.id]);
   const a=await this.auth.authenticate(header,db),s=(await db.query('SELECT family_id FROM sessions WHERE id=$1',[a.sessionId])).rows[0];
   const result=await work(db,a,s.family_id); await db.query('COMMIT');return result;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 private async rate(db:PoolClient,user:string,contact:string,ip:string,purpose:string) {
  // Serialize shared contact/IP quotas across accounts and workers.
  for(const lock of [contact,ip].sort()) await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[lock]);
  const rows=(await db.query(`SELECT actor_id,contact_hash,ip_hash,created_at FROM auth_rate_events
   WHERE purpose=$1 AND created_at>clock_timestamp()-interval '1 hour' AND (actor_id=$2 OR contact_hash=$3 OR ip_hash=$4)`,[purpose,user,contact,ip])).rows;
  if(rows.filter(r=>r.actor_id===user).length>=20 || rows.filter(r=>r.contact_hash===contact).length>=5 || rows.filter(r=>r.ip_hash===ip).length>=100 ||
   rows.some(r=>r.contact_hash===contact&&r.created_at>new Date(Date.now()-60000))) throw new HttpException({code:'RATE_LIMITED'},429);
  await db.query('INSERT INTO auth_rate_events(actor_id,contact_hash,ip_hash,purpose) VALUES($1,$2,$3,$4)',[user,contact,ip,purpose]);
 }
 request(header:string|undefined,input:ReturnType<typeof challengeInput>,ip:string) {
  this.messages.requireContact(input.contact);
  return this.tx(header,async(db,a,family)=>{
   const existing=(await db.query('SELECT subject FROM identities WHERE user_id=$1 AND provider=$2',[a.user.id,input.provider])).rows[0];
   if((input.provider==='email'&&!existing)||existing&&existing.subject!==input.contact)throw new BadRequestException();
   const hash=this.messages.secrets.hash(input.contact);
   await this.rate(db,a.user.id,hash,this.messages.secrets.hash(ip),'verify');
   await db.query('UPDATE auth_challenges SET invalidated_at=clock_timestamp() WHERE user_id=$1 AND provider=$2 AND consumed_at IS NULL',[a.user.id,input.provider]);
   const code=String(randomInt(0,1000000)).padStart(6,'0');
   const c=(await db.query(`INSERT INTO auth_challenges(user_id,provider,contact_hash,contact_cipher,code_hash,family_id,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()+interval '5 minutes') RETURNING id,expires_at`,[a.user.id,input.provider,hash,this.messages.secrets.encrypt(input.contact),this.messages.secrets.hash(code),family])).rows[0];
   await this.messages.queue(db,'challenge',c.id,{contact:input.contact,subject:'Xác minh liên hệ — DEMO',text:`Mã xác minh: ${code}. Có hiệu lực 5 phút. Chỉ dùng trong DEMO local/test.`},c.expires_at);
   return {id:c.id,expires_at:c.expires_at.toISOString(),resend_after_seconds:60};
  });
 }
 async verify(header:string|undefined,input:ReturnType<typeof verifyInput>) {
  const result=await this.tx(header,async(db,a,family)=>{
   const c=(await db.query('SELECT * FROM auth_challenges WHERE id=$1 AND user_id=$2 FOR UPDATE',[input.challenge_id,a.user.id])).rows[0];
   if(!c||c.family_id!==family||c.consumed_at||c.invalidated_at||c.attempts>=5)return 'CHALLENGE_INVALID';
   if(c.expires_at<=new Date())return 'CHALLENGE_EXPIRED';
   if(c.code_hash!==this.messages.secrets.hash(input.code)){
    await db.query('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1',[c.id]);return 'CHALLENGE_INVALID';
   }
   const contact=this.messages.secrets.decrypt(c.contact_cipher);this.messages.requireContact(contact);
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[c.contact_hash]);
   const existing=(await db.query('SELECT user_id,subject FROM identities WHERE provider=$1 AND (subject=$2 OR user_id=$3)',[c.provider,contact,a.user.id])).rows;
   if(existing.some(i=>i.user_id!==a.user.id||i.subject!==contact)) return 'CHALLENGE_INVALID';
   await db.query(`INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,$2,$3,clock_timestamp())
    ON CONFLICT(user_id,provider) DO UPDATE SET verified_at=EXCLUDED.verified_at`,[a.user.id,c.provider,contact]);
   await db.query('UPDATE auth_challenges SET consumed_at=clock_timestamp() WHERE id=$1',[c.id]);
   await db.query('UPDATE users SET version=version+1 WHERE id=$1',[a.user.id]);
   return {id:c.id,version:1,state:'verified'};
  });
  // Return the failure after committing the attempt counter.
  if(typeof result==='string')throw new BadRequestException({code:result});return result;
 }
 async reauthenticate(header:string|undefined,password:string,ip:string) {
  const result=await this.tx(header,async(db,a,family)=>{
   // Persist failed password attempts as well; no raw secret in snapshots/logs.
   const count=(await db.query("SELECT count(*) FROM auth_rate_events WHERE actor_id=$1 AND purpose='reauth' AND created_at>clock_timestamp()-interval '15 minutes'",[a.user.id])).rows[0];
   if(Number(count.count)>=5)throw new HttpException({code:'RATE_LIMITED'},429);
   await db.query("INSERT INTO auth_rate_events(actor_id,contact_hash,ip_hash,purpose) VALUES($1,'reauth',$2,'reauth')",[a.user.id,this.messages.secrets.hash(ip)]);
   const identity=(await db.query("SELECT password_hash FROM identities WHERE user_id=$1 AND provider='email'",[a.user.id])).rows[0];
   if(!await verifyPassword(password,identity?.password_hash??null))return null;
   const grant=randomBytes(32).toString('hex');
   const row=(await db.query("INSERT INTO reauth_grants(grant_hash,user_id,family_id,scope,expires_at) VALUES($1,$2,$3,'membership.grants',clock_timestamp()+interval '5 minutes') RETURNING expires_at",[this.messages.secrets.hash(grant),a.user.id,family])).rows[0];
   return {grant,expires_at:row.expires_at.toISOString()};
  });
  if(!result)throw new ForbiddenException({code:'REAUTH_REQUIRED'});return result;
 }
}
