import { NotFoundException, UnauthorizedException, type OnModuleDestroy } from '@nestjs/common';
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { Pool } from 'pg';
import type { AuthService } from '../auth/auth.service.js';
import type { Resource } from '../../common/events/event.store.js';
import { resourceAccess } from './realtime.access.js';
import { uuid } from '../../logging/sanitize.js';
export type Envelope={event_id:string;type:string;occurred_at:string;aggregate_version:number;correlation_id:string;data:unknown};
type Connection={socket:Socket;user:string;token:string;resources:Map<string,Resource>;expiry:ReturnType<typeof setTimeout>;packets:number;window:number;busy:boolean;expiresAt:number};
// A Nest-managed gateway attached to the same HTTP server, with no second framework adapter.
export class RealtimeGateway implements OnModuleDestroy {
  private io?:Server;
  private readonly connections=new Map<string,Connection>();
  private unsubscribe?:()=>void;
  readonly metrics={connected:0,denied:0,emitted:0,slow:0};
  constructor(private readonly pool:Pool,private readonly auth:AuthService){}
  attach(http:HttpServer,origins:string[]){
    const io=this.io=new Server(http,{path:'/v1/realtime/socket.io',transports:['websocket'],serveClient:false,connectTimeout:5000,maxHttpBufferSize:8192,pingInterval:20000,pingTimeout:10000,
      allowRequest:(req,done)=>done(null,(!req.headers.origin||origins.includes(req.headers.origin)) && this.connections.size<1000 && (!this.io||this.io.engine.clientsCount<1100))});
    io.use((socket,next)=>{void (async()=>{
      const token:unknown=socket.handshake.auth?.token;
      if(typeof token!=='string'||token.length>4096)throw new UnauthorizedException();
      const actor=await this.auth.authenticate('Bearer '+token);
      if([...this.connections.values()].filter(c=>c.user===actor.user.id).length>=10)throw new UnauthorizedException();
      socket.data.identity={user:actor.user.id,token,expiresAt:actor.expiresAt};
    })().then(()=>next(),()=>{this.metrics.denied++;next(new Error('UNAUTHENTICATED'));});});
    io.on('connection',socket=>{
      const a=socket.data.identity;delete socket.data.identity;
      if([...this.connections.values()].filter(c=>c.user===a.user).length>=10){this.close(socket);return;}
      const c:Connection={socket,user:a.user,token:a.token,resources:new Map(),expiry:setTimeout(()=>this.close(socket),Math.max(1,a.expiresAt-Date.now())),packets:0,window:Date.now(),busy:false,expiresAt:a.expiresAt};
      this.connections.set(socket.id,c);this.metrics.connected=this.connections.size;
      socket.on('disconnect',()=>{clearTimeout(c.expiry);this.connections.delete(socket.id);this.metrics.connected=this.connections.size;c.resources.clear();c.token='';});
      // Every client packet is bounded, including unknown event names.
      socket.use((_packet,next)=>{if(Date.now()-c.window>=10000){c.window=Date.now();c.packets=0;}if(++c.packets>40){this.close(socket);return;}next();});
      for(const action of ['subscribe','unsubscribe'])socket.on(action,(input:unknown,ack:unknown)=>{
        if(typeof ack!=='function')return;
        const p=input as {type?:string;id?:string;request_id?:string};
        if(!p||!['conversation','job','invoice','report','verification','review'].includes(p.type??'')||typeof p.id!=='string'||!uuid.test(p.id)||typeof p.request_id!=='string'||!uuid.test(p.request_id)||Object.keys(p).some(k=>!['type','id','request_id'].includes(k))){ack({ok:false,code:'VALIDATION'});return;}
        const resource={type:p.type,id:p.id} as Resource,key=resource.type+':'+resource.id;
        if(action==='unsubscribe'){c.resources.delete(key);ack({ok:true,request_id:p.request_id});return;}
        if(c.busy||c.resources.size>=32){ack({ok:false,code:'RATE_LIMITED',request_id:p.request_id});return;}
        c.busy=true;void this.withAccess(c,resource,()=>{c.resources.set(key,resource);ack({ok:true,request_id:p.request_id});}).catch(()=>{ack({ok:false,code:'FORBIDDEN',request_id:p.request_id});}).finally(()=>{c.busy=false;});
      });
      // Close the handshake -> connected race against logout/refresh/revocation.
      void this.withAccess(c,undefined,()=>{}).catch(()=>this.close(socket));
    });
    this.unsubscribe=this.auth.onAccessChange(()=>this.audit());
  }
  private close(socket:Socket){socket.disconnect(true);socket.conn.close(true);}
  private async withAccess(c:Connection,resource:Resource|undefined,work:()=>void){
    const db=await this.pool.connect();
    try{
      await db.query('BEGIN');
      await db.query('SELECT id FROM users WHERE id=$1 FOR SHARE',[c.user]);
      await this.auth.authenticate('Bearer '+c.token,db);
      if(resource)await resourceAccess(db,c.user,resource);
      // Enqueue synchronously while ACL locks still hold. Never wait for a network ACK in a transaction.
      if(Date.now()>=c.expiresAt)throw new UnauthorizedException();
      if(c.socket.connected)work();
      await db.query('COMMIT');
    }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  }
  async audit(){
    for(const c of [...this.connections.values()]){
      try{await this.withAccess(c,undefined,()=>{});}catch{this.close(c.socket);continue;}
      for(const [key,resource] of c.resources)try{await this.withAccess(c,resource,()=>{});}catch{
        c.resources.delete(key);c.socket.emit('access.revoked',resource);
      }
      c.socket.emit('resync.required');
    }
  }
  async publish(user:string,resource:Resource,event:Envelope){
    const groups=new Map<string,Connection[]>();
    for(const c of this.connections.values())if(c.user===user&&c.socket.connected){const group=groups.get(c.token)??[];group.push(c);groups.set(c.token,group);}
    for(const group of groups.values()){
      const c=group[0];
      try{await this.withAccess(c,resource,()=>{
        // Minimal invalidations also reach list views. Subscription never expands the recipient snapshot.
        for(const target of group){
          if(!target.socket.connected)continue;
          if(!target.socket.conn.transport.writable){this.metrics.slow++;target.socket.emit('resync.required');this.close(target.socket);continue;}
          target.socket.volatile.emit('domain.event',event);this.metrics.emitted++;
        }
      });}catch(e){
        if(e instanceof UnauthorizedException){for(const t of group)this.close(t.socket);continue;}
        if(e instanceof NotFoundException){const key=resource.type+':'+resource.id;for(const t of group)if(t.resources.delete(key))t.socket.emit('access.revoked',resource);continue;}
        throw e;
      }
    }
  }
  async onModuleDestroy(){this.unsubscribe?.();for(const c of this.connections.values())this.close(c.socket);if(this.io)await new Promise<void>(resolve=>this.io!.close(()=>resolve()));}
}
