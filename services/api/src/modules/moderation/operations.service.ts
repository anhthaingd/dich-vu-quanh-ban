import {BadRequestException,ConflictException,ForbiddenException,NotFoundException} from '@nestjs/common';
import type {Pool,PoolClient} from 'pg';
import {AuthService} from '../auth/auth.service.js';
import {AdminAuthService} from '../admin-auth/admin-auth.service.js';
import {AccountTransaction} from '../accounts/account-transaction.js';
import {Cursor} from '../../common/http/cursor.js';
import {queueInput} from './moderation.input.js';
import {operationInput,type OperationDomain} from './operations.input.js';
import {decisionHistory,recordDecision} from './history.js';
export class OperationsService {
 private tx:AccountTransaction;
 constructor(private pool:Pool,private auth:AuthService,private admin:AdminAuthService,private cursor:Cursor){this.tx=new AccountTransaction(pool,auth);}
 permission(d:OperationDomain){return d==='users'?'accounts.manage':d==='partners'?'moderation.manage':'catalog.manage';}
 async detail(db:PoolClient,d:OperationDomain,id:string){
  const r=(await db.query(`SELECT * FROM ${d} WHERE id=$1`,[id])).rows[0];if(!r)throw new NotFoundException();
  const common={id:r.id,version:r.version,name:r.display_name??r.name??r.name_vi,history:await decisionHistory(db,d,id)};
  if(d==='users'){
   const contacts=(await db.query('SELECT provider,subject FROM identities WHERE user_id=$1 ORDER BY provider',[id])).rows;
   return {...common,state:r.status,contacts:contacts.map(c=>({kind:c.provider,value:c.provider==='email'?c.subject.replace(/^(.).*(@.*)$/,'$1***$2'):'***'+c.subject.slice(-4)}))};
  }
  if(d==='partners')return {...common,state:r.moderation_status,kind:r.kind,accepting_jobs:r.accepting_jobs,
   open_jobs:Number((await db.query("SELECT count(*) FROM jobs WHERE partner_id=$1 AND state IN ('requested','accepted','awaiting_settlement')",[id])).rows[0].count)};
  return {...common,state:r.active?'active':'inactive',code:r.code,parent_id:d==='categories'?r.parent_id:null,
   category_ids:d==='skills'?(await db.query('SELECT category_id FROM skill_categories WHERE skill_id=$1 ORDER BY category_id',[id])).rows.map(x=>x.category_id):[]};
 }
 list(header:string|undefined,token:string|undefined,d:OperationDomain,q:ReturnType<typeof queueInput>){
  const states=d==='users'?['active','suspended','deletion_requested','anonymized']:d==='partners'?['active','new_work_suspended','suspended']:['active','inactive'];
  if(q.state!=='all'&&!states.includes(q.state))throw new BadRequestException();
  return this.admin.read(header,token,this.permission(d),async(db,a)=>{
   const scope=`operations:${d}:${a.user.id}:${JSON.stringify([q.q,q.state])}`,after=this.cursor.decode(q.cursor,scope);
   const name=d==='users'?'display_name':d==='partners'?'name':'name_vi';
   const state=d==='users'?'status':d==='partners'?'moderation_status':"CASE WHEN active THEN 'active' ELSE 'inactive' END";
   // Table/column strings come only from the validated closed domain, never request text.
   const {rows}=await db.query(`SELECT r.id,date_trunc('milliseconds',r.created_at) AS created_at FROM ${d} r
    WHERE ($1='' OR position(lower($1) in lower(r.id::text||' '||r.${name}${d==='categories'||d==='skills'?"||' '||r.code":''}))>0
    ${d==='users'?"OR EXISTS(SELECT 1 FROM identities i WHERE i.user_id=r.id AND lower(i.subject)=lower($1))":''})
    AND ($2='all' OR (${state})=$2)
    AND ($3::timestamptz IS NULL OR (date_trunc('milliseconds',r.created_at),r.id)<($3::timestamptz,$4::uuid))
    ORDER BY date_trunc('milliseconds',r.created_at) DESC,r.id DESC LIMIT $5`,[q.q,q.state,after?.created_at??null,after?.id??null,q.limit+1]);
   const page=rows.slice(0,q.limit),last=page.at(-1);
   await this.auditRead(db,a.user.id,d,a.user.id,page.map(r=>r.id));
   return {items:await Promise.all(page.map(r=>this.detail(db,d,r.id))),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
  });
 }
 private async auditRead(db:PoolClient,user:string,d:OperationDomain,id:string,ids:string[]){
  await db.query("INSERT INTO audit_events(actor_id,action,resource_id,reason,details) VALUES($1,$2,$3,'Administration read',$4)",[user,`admin.${d}.read`,id,JSON.stringify({resource_ids:ids})]);
 }
 get(header:string|undefined,token:string|undefined,d:OperationDomain,id:string){return this.admin.read(header,token,this.permission(d),async(db,a)=>{
  const value=await this.detail(db,d,id);await this.auditRead(db,a.user.id,d,id,[id]);return value;
 });}
 async save(header:string|undefined,token:string|undefined,d:OperationDomain,id:string|null,input:ReturnType<typeof operationInput>,key:string){
  try{return await this.tx.run(header,`admin.operations.${d}:${id??'create'}`,key,input,async(db,a)=>{
   let target=id;
   if(d==='users'){
    if(id===a.user.id)throw new ForbiddenException();
    // Do not allow the account-management role to lock another administrator.
    // Admin grant/recovery administration belongs to the separate P2 workflow.
    if((await db.query('SELECT 1 FROM admin_grants WHERE user_id=$1 AND revoked_at IS NULL',[id])).rowCount)throw new ForbiddenException();
   }
   if(d==='categories'||d==='skills'){
    await db.query('SELECT pg_advisory_xact_lock(2809202601)');
    if(!('name_vi' in input))throw new BadRequestException();
    const duplicate=d==='categories'
     ?await db.query("SELECT 1 FROM categories WHERE id IS DISTINCT FROM $1::uuid AND lower(name_vi)=lower($2) AND parent_id IS NOT DISTINCT FROM CASE WHEN $1::uuid IS NULL THEN $3::uuid ELSE (SELECT parent_id FROM categories WHERE id=$1) END",[id,input.name_vi,input.parent_id])
     :await db.query("SELECT 1 FROM skills s JOIN skill_categories sc ON sc.skill_id=s.id WHERE s.id IS DISTINCT FROM $1::uuid AND lower(s.name_vi)=lower($2) AND sc.category_id=CASE WHEN $1::uuid IS NULL THEN $3::uuid ELSE (SELECT category_id FROM skill_categories WHERE skill_id=$1 LIMIT 1) END",[id,input.name_vi,input.category_ids?.[0]??null]);
    if(duplicate.rowCount)throw new ConflictException({code:'STATE_CONFLICT'});
    if(id){
     const r=(await db.query(`SELECT * FROM ${d} WHERE id=$1 FOR UPDATE`,[id])).rows[0];this.version(r,input.expected_version);
     await db.query(`UPDATE ${d} SET name_vi=$2,active=$3,version=version+1 WHERE id=$1`,[id,input.name_vi,input.active]);
    }else{
     const parent=d==='categories'?input.parent_id:input.category_ids?.[0];
     if(parent){
      const p=(await db.query('SELECT parent_id,active FROM categories WHERE id=$1 FOR SHARE',[parent])).rows[0];
      if(!p||!p.active||(d==='categories'?p.parent_id!==null:p.parent_id===null))throw new BadRequestException();
      if(d==='skills'&&!(await db.query('SELECT 1 FROM categories WHERE id=$1 AND active',[p.parent_id])).rowCount)throw new BadRequestException();
     }
     const r=d==='categories'?(await db.query('INSERT INTO categories(code,name_vi,parent_id,active) VALUES($1,$2,$3,$4) RETURNING id',[input.code,input.name_vi,parent,input.active])).rows[0]
      :(await db.query('INSERT INTO skills(code,name_vi,active) VALUES($1,$2,$3) RETURNING id',[input.code,input.name_vi,input.active])).rows[0];
     target=r.id;
     if(d==='skills')await db.query('INSERT INTO skill_categories(skill_id,category_id) VALUES($1,$2)',[target,parent]);
    }
   }else{
    const r=(await db.query(`SELECT * FROM ${d} WHERE id=$1 FOR UPDATE`,[id])).rows[0];this.version(r,input.expected_version);
    if(d==='users'){
     if(!['active','suspended'].includes(r.status))throw new ConflictException({code:'STATE_CONFLICT'});
     await db.query('UPDATE users SET status=$2,version=version+1 WHERE id=$1',[id,input.action==='restore'?'active':'suspended']);
     await db.query('UPDATE sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1',[id]);
     await db.query('UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1',[id]);
    }else{
     if(r.archived_at)throw new ConflictException({code:'STATE_CONFLICT'});
     await db.query("UPDATE partners SET moderation_status=CASE WHEN $2='warn' THEN moderation_status WHEN $2='restore' THEN 'active' ELSE 'new_work_suspended' END,accepting_jobs=CASE WHEN $2='suspend_new' THEN false ELSE accepting_jobs END,version=version+1 WHERE id=$1",[id,input.action]);
    }
   }
   const version=(await db.query(`SELECT version FROM ${d} WHERE id=$1`,[target])).rows[0].version;
   await recordDecision(db,d,target!,a.user.id,input.action,input.reason,version);
   return this.detail(db,d,target!);
  },async(db,a)=>{await this.admin.check(db,a,token,this.permission(d),true);});
  }catch(e){if((e as {code?:string}).code==='23505')throw new ConflictException({code:'STATE_CONFLICT'});throw e;}
  finally{if(d==='users')await this.auth.accessChanged();}
 }
 private version(r:{version:number}|undefined,expected:number){if(!r)throw new NotFoundException();if(r.version!==expected)throw new ConflictException({code:'VERSION_CONFLICT'});}
}
