import {ForbiddenException,HttpException,ServiceUnavailableException,ConflictException} from '@nestjs/common';
import {randomBytes,createHash} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {verifyPassword} from '../auth/password.js';
import {MessageSecrets} from '../../integrations/local-messages.js';
import {base32,decode32,matchCounter} from './totp.js';
export type AdminConfig={secret:string};
export type Actor=Awaited<ReturnType<AuthService['authenticate']>>;
export const tokenHash=(s:string)=>createHash('sha256').update(s).digest('hex');
export class AdminAuthService {
 readonly secrets:MessageSecrets;
 constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly config?:AdminConfig){this.secrets=new MessageSecrets(config?.secret??randomBytes(32).toString('hex'));}
 requireConfigured(){if(!this.config)throw new ServiceUnavailableException();}
 async grants(db:PoolClient,a:Actor,permission?:string){
  this.requireConfigured();const rows=(await db.query('SELECT permission FROM admin_grants WHERE user_id=$1 AND revoked_at IS NULL ORDER BY permission FOR SHARE',[a.user.id])).rows;
  if(!rows.length||(permission&&!rows.some(r=>r.permission===permission)))throw new ForbiddenException();
 }
 async check(db:PoolClient,a:Actor,token:string|undefined,permission?:string,fresh=false){
  await this.grants(db,a,permission);
  if(!token||!/^[a-f0-9]{64}$/.test(token))throw new ForbiddenException({code:'REAUTH_REQUIRED'});
  const row=(await db.query(`SELECT x.* FROM admin_sessions x JOIN sessions s ON s.family_id=x.family_id
    WHERE x.token_hash=$1 AND x.user_id=$2 AND s.id=$3 AND x.revoked_at IS NULL AND x.expires_at>clock_timestamp()
    AND EXISTS(SELECT 1 FROM admin_factors f WHERE f.user_id=x.user_id AND f.enabled_at IS NOT NULL) FOR SHARE OF x`,[tokenHash(token),a.user.id,a.sessionId])).rows[0];
  if(!row||(fresh&&row.verified_at.getTime()<Date.now()-300000))throw new ForbiddenException({code:'REAUTH_REQUIRED'});return row;
 }
 async read<T>(header:string|undefined,token:string|undefined,permission:string|undefined,work:(db:PoolClient,a:Actor)=>Promise<T>){return this.transaction(header,async(db,a)=>{await this.check(db,a,token,permission);return work(db,a);});}
 async transaction<T>(header:string|undefined,work:(db:PoolClient,a:Actor)=>Promise<T>){
  const initial=await this.auth.authenticate(header),db=await this.pool.connect();
  try{await db.query('BEGIN');await db.query('SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE',[initial.user.id]);const a=await this.auth.authenticate(header,db);const result=await work(db,a);await db.query('COMMIT');return result;}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async status(header:string|undefined){return this.transaction(header,async(db,a)=>{await this.grants(db,a);const r=(await db.query('SELECT enabled_at FROM admin_factors WHERE user_id=$1',[a.user.id])).rows[0];return {enrolled:!!r?.enabled_at};});}
 private async password(db:PoolClient,a:Actor,password:string){
  const n=(await db.query("SELECT count(*) FROM admin_auth_attempts WHERE user_id=$1 AND created_at>clock_timestamp()-interval '15 minutes'",[a.user.id])).rows[0];
  if(Number(n.count)>=10)throw new HttpException({code:'RATE_LIMITED'},429);
  await db.query('INSERT INTO admin_auth_attempts(user_id) VALUES($1)',[a.user.id]);
  const r=(await db.query("SELECT password_hash FROM identities WHERE user_id=$1 AND provider='email'",[a.user.id])).rows[0];return verifyPassword(password,r?.password_hash??null);
 }
 private async issue(db:PoolClient,a:Actor){
  const token=randomBytes(32).toString('hex');const r=(await db.query(`INSERT INTO admin_sessions(user_id,family_id,token_hash,expires_at)
   SELECT $1,family_id,$2,clock_timestamp()+interval '15 minutes' FROM sessions WHERE id=$3 RETURNING expires_at,verified_at`,[a.user.id,tokenHash(token),a.sessionId])).rows[0];
  return {token,expires_at:r.expires_at.toISOString(),fresh_until:new Date(r.verified_at.getTime()+300000).toISOString()};
 }
 async enroll(header:string|undefined,password:string){
  const result=await this.transaction(header,async(db,a)=>{
   await this.grants(db,a);if(!await this.password(db,a,password))return null;
   const f=(await db.query('SELECT enabled_at FROM admin_factors WHERE user_id=$1',[a.user.id])).rows[0];if(f?.enabled_at)throw new ConflictException({code:'STATE_CONFLICT'});
   const secret=base32(randomBytes(20));
   await db.query(`INSERT INTO admin_factors(user_id,secret_cipher,enrollment_family,pending_until)
    SELECT $1,$2,family_id,clock_timestamp()+interval '5 minutes' FROM sessions WHERE id=$3
    ON CONFLICT(user_id) DO UPDATE SET secret_cipher=EXCLUDED.secret_cipher,enrollment_family=EXCLUDED.enrollment_family,pending_until=EXCLUDED.pending_until,last_counter=-1`,[a.user.id,this.secrets.encrypt(secret),a.sessionId]);
   return {secret,uri:`otpauth://totp/DVQB:${a.user.id}?secret=${secret}&issuer=DVQB&algorithm=SHA1&digits=6&period=30`};
  });if(!result)throw new ForbiddenException({code:'REAUTH_REQUIRED'});return result;
 }
 async verify(header:string|undefined,password:string,code:string,enrollment=false){
  const result=await this.transaction(header,async(db,a)=>{
   await this.grants(db,a);if(!await this.password(db,a,password))return null;
   const f=(await db.query('SELECT f.*,s.family_id FROM admin_factors f JOIN sessions s ON s.id=$2 WHERE f.user_id=$1 FOR UPDATE OF f',[a.user.id,a.sessionId])).rows[0];
   if(!f||Boolean(f.enabled_at)===enrollment||(enrollment&&(f.pending_until<=new Date()||f.enrollment_family!==f.family_id)))return null;
   const counter=matchCounter(decode32(this.secrets.decrypt(f.secret_cipher)),code,Date.now(),Number(f.last_counter));if(counter===null)return null;
   await db.query('UPDATE admin_factors SET enabled_at=COALESCE(enabled_at,clock_timestamp()),last_counter=$2 WHERE user_id=$1',[a.user.id,counter]);
   await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$1,'MFA', '{}')",[a.user.id,enrollment?'admin.mfa.enroll':'admin.mfa.verify']);
   return this.issue(db,a);
  });if(!result)throw new ForbiddenException({code:'REAUTH_REQUIRED'});return result;
 }
 lock(header:string|undefined){return this.transaction(header,async(db,a)=>{await db.query('UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1 AND family_id=(SELECT family_id FROM sessions WHERE id=$2)',[a.user.id,a.sessionId]);return {id:a.user.id,version:1,state:'locked'};});}
}
