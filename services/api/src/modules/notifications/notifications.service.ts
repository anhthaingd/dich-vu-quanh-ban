import {event} from '../../common/events/event.store.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import { AccountTransaction } from '../accounts/account-transaction.js';
import { object, type PageInput } from '../accounts/accounts.input.js';
import type { Cursor } from '../../common/http/cursor.js';
export function settingsInput(body:unknown) {
  const b=object(body,['message_push','call_push','service_push','reminder_push']);
  if(['message_push','call_push','service_push','reminder_push'].some(k=>typeof b[k]!=='boolean'))throw new BadRequestException();
  return {message_push:b.message_push as boolean,call_push:b.call_push as boolean,service_push:b.service_push as boolean,reminder_push:b.reminder_push as boolean};
}
export class NotificationsService {
  private readonly tx:AccountTransaction;
  constructor(private readonly pool:Pool,private readonly auth:AuthService,private readonly cursor:Cursor){this.tx=new AccountTransaction(pool,auth);}
  private async readTx<T>(header:string|undefined,work:(db:PoolClient,user:string)=>Promise<T>){
    const db=await this.pool.connect();try{await db.query('BEGIN');const a=await this.auth.authenticate(header,db);const result=await work(db,a.user.id);await db.query('COMMIT');return result;}
    catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  settings(header:string|undefined){return this.readTx(header,async(db,user)=>(await db.query('SELECT message_push,call_push,service_push,reminder_push FROM notification_settings WHERE user_id=$1',[user])).rows[0]??{message_push:true,call_push:true,service_push:true,reminder_push:true});}
  setSettings(header:string|undefined,input:ReturnType<typeof settingsInput>,key:string){return this.tx.run(header,'setSettings',key,input,async(db,a)=>{
    await db.query(`INSERT INTO notification_settings(user_id,message_push,call_push,service_push,reminder_push) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET message_push=$2,call_push=$3,service_push=$4,reminder_push=$5`,[a.user.id,input.message_push,input.call_push,input.service_push,input.reminder_push]);return input;
  });}
  registerDevice(header:string|undefined,input:{token:string;platform:string},key:string){return this.tx.run(header,'registerDevice',key,input,async(db,a)=>{
    const family=(await db.query('SELECT family_id FROM sessions WHERE id=$1',[a.sessionId])).rows[0].family_id;
    const r=(await db.query(`INSERT INTO push_devices(user_id,family_id,token,platform) VALUES($1,$2,$3,$4)
      ON CONFLICT(token) DO UPDATE SET user_id=$1,family_id=$2,platform=$4,revoked_at=NULL,updated_at=now() RETURNING id`,[a.user.id,family,input.token,input.platform])).rows[0];return {id:r.id,version:1,state:'registered'};
  });}
  list(header:string|undefined,q:PageInput){return this.readTx(header,async(db,user)=>{
    const scope=`notifications:${user}`,start=this.cursor.decode(q.cursor,scope);
    const {rows}=await db.query(`SELECT id,kind,resource_ref,read_at,date_trunc('milliseconds',created_at) AS created_at FROM notifications WHERE user_id=$1 AND kind NOT LIKE 'conversation.%'
      AND ($2::timestamptz IS NULL OR (date_trunc('milliseconds',created_at),id)<($2::timestamptz,$3::uuid)) ORDER BY date_trunc('milliseconds',created_at) DESC,id DESC LIMIT $4`,[user,start?.created_at??null,start?.id??null,q.limit+1]);
    const page=rows.slice(0,q.limit),last=page.at(-1);
    return {items:page.map(n=>({...n,created_at:n.created_at.toISOString(),read_at:n.read_at?.toISOString()??null})),next_cursor:rows.length>q.limit?this.cursor.encode({id:last.id,created_at:last.created_at.toISOString()},scope):null};
  });}
  read(header:string|undefined,id:string,key:string){return this.tx.run(header,`readNotification:${id}`,key,{},async(db,a)=>{
    const {rowCount}=await db.query('UPDATE notifications SET read_at=clock_timestamp() WHERE id=$1 AND user_id=$2 AND read_at IS NULL',[id,a.user.id]);
    if(rowCount)await event(db,`notice-read:${id}`,id,2,'notification.read.v1',{notification_id:id});return {id,version:1,state:'read'};
  },async(db,a)=>{if(!(await db.query("SELECT 1 FROM notifications WHERE id=$1 AND user_id=$2 AND kind NOT LIKE 'conversation.%'",[id,a.user.id])).rowCount)throw new NotFoundException();});}
}

export function deviceInput(value:unknown){const v=object(value,['token','platform']);if(typeof v.token!=='string'||! /^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_-]{10,200}\]$/.test(v.token)||!['ios','android'].includes(String(v.platform)))throw new BadRequestException();return {token:v.token,platform:String(v.platform)};}
