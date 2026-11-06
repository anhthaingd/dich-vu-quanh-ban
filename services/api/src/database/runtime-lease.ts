import type {Pool,PoolClient} from 'pg';
import {ServiceUnavailableException,type OnModuleDestroy} from '@nestjs/common';

// A dedicated PostgreSQL session owns the lab gateway for the lifetime of the API.
// Loss is terminal: ECS must replace this task, never silently reacquire its lease.
export class RuntimeLease implements OnModuleDestroy {
 private client?:PoolClient;private timer?:ReturnType<typeof setInterval>;private pending?:Promise<void>;
 private active:boolean;private readonly listeners=new Set<()=>void>();
 constructor(private readonly pool:Pool,private readonly enabled=false){this.active=!enabled;}
 get ready(){return this.active;}
 onLoss(fn:()=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}
 async acquire(){
  if(!this.enabled)return;
  const client=await this.pool.connect();this.client=client;client.on('error',this.lost);
  try{
   const r=await client.query("SELECT pg_try_advisory_lock(hashtextextended(current_schema()||':dvqb-realtime',0)) AS acquired");
   if(!r.rows[0].acquired)throw new Error('LAB_RUNTIME_ALREADY_ACTIVE');
   this.active=true;this.timer=setInterval(()=>{void this.check().catch(()=>{});},500);this.timer.unref();
  }catch(e){this.lost();throw e;}
 }
 private lost=()=>{
  this.active=false;clearInterval(this.timer);
  const client=this.client;this.client=undefined;
  if(client){client.off('error',this.lost);client.release(true);}
  for(const fn of this.listeners)fn();
 };
 async check(){
  if(!this.active)throw new ServiceUnavailableException();
  if(!this.enabled)return;
  if(!this.pending)this.pending=(async()=>{try{let timeout:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([this.client!.query('SELECT 1'),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Lease heartbeat timeout')),1000);})]);}finally{clearTimeout(timeout);}if(!this.active)throw new Error('lease lost');}catch{this.lost();throw new ServiceUnavailableException();}})().finally(()=>{this.pending=undefined;});
  return this.pending;
 }
 async onModuleDestroy(){this.lost();await this.pending?.catch(()=>{});this.listeners.clear();}
}
