import {Platform} from 'react-native';
import {io,type Socket} from 'socket.io-client';
import {randomUUID} from 'expo-crypto';
export type Resource={type:'conversation'|'job'|'invoice'|'report'|'verification'|'review';id:string};
export type DomainEvent={event_id:string;type:string;aggregate_version:number;data:Record<string,unknown>};
export type Signal={kind:'event';event:DomainEvent}|{kind:'sync'}|{kind:'revoked';resource:Resource};
type Credentials={token:string;owner:string;expiresAt:number};
export class RealtimeClient {
 private credentials:Credentials|null=null;
 private socket?:Socket;
 private foreground=true;
 private timer?:ReturnType<typeof setTimeout>;
 private expiry?:ReturnType<typeof setTimeout>;
 private generation=0;
 private retries=0;
 private subscribing=false;
 private pendingSubscriptions:Resource[]=[];
 private refresh?:()=>Promise<void>;
 private readonly seen=new Set<string>();
 private readonly listeners=new Set<(signal:Signal)=>void>();
 private readonly resources=new Map<string,{resource:Resource;count:number}>();
 connected=false;
 constructor(private readonly url:string|undefined,private readonly enabled:boolean,private readonly factory=io){}
 setRefresh(fn:()=>Promise<void>){this.refresh=fn;}
 setSession(value:Credentials|null){
  if(this.credentials?.token===value?.token)return;
  if(this.credentials?.owner!==value?.owner)this.resources.clear();
  this.stop();this.credentials=value;this.seen.clear();this.retries=0;
  this.start();
 }
 setForeground(value:boolean){if(this.foreground===value)return;this.foreground=value;this.stop();if(value)this.start();}
 listen(fn:(signal:Signal)=>void){this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};}
 private signal(signal:Signal){for(const fn of this.listeners)fn(signal);}
 watch(resource:Resource){
  const key=resource.type+':'+resource.id,entry=this.resources.get(key);
  if(entry)entry.count++;else{this.resources.set(key,{resource,count:1});if(this.connected)this.subscribe(resource);}
  return ()=>{const r=this.resources.get(key);if(!r)return;if(--r.count===0){this.resources.delete(key);if(this.connected)this.socket?.emit('unsubscribe',{...resource,request_id:randomUUID()},()=>{});}};
 }
 private subscribe(resource:Resource){
  this.pendingSubscriptions.push(resource);this.subscribeNext();
 }
 private subscribeNext(){
  if(this.subscribing||!this.connected)return;
  const resource=this.pendingSubscriptions.shift();if(!resource)return;
  if(!this.resources.has(resource.type+':'+resource.id)){this.subscribeNext();return;}
  this.subscribing=true;
  const socket=this.socket,generation=this.generation;
  socket?.timeout(5000).emit('subscribe',{...resource,request_id:randomUUID()},(error:Error|null,ack:{ok:boolean;code?:string})=>{
   if(this.socket!==socket||generation!==this.generation)return;
   this.subscribing=false;
   if(!error&&ack?.ok)this.signal({kind:'sync'});
   else if(!error&&['FORBIDDEN','NOT_FOUND'].includes(ack?.code??''))this.signal({kind:'revoked',resource});
   else {this.stop();this.schedule();return;}
   this.subscribeNext();
  });
 }
 private stop(){this.generation++;this.subscribing=false;this.pendingSubscriptions=[];clearTimeout(this.timer);clearTimeout(this.expiry);this.timer=undefined;this.expiry=undefined;this.connected=false;this.socket?.removeAllListeners();this.socket?.disconnect();this.socket=undefined;}
 private schedule(forceRefresh=false){
  if(this.timer||!this.foreground||!this.credentials||!this.enabled)return;
  const generation=this.generation;
  this.timer=setTimeout(()=>{this.timer=undefined;if(generation!==this.generation)return;
   void (async()=>{if(forceRefresh||this.credentials!.expiresAt<=Date.now())await this.refresh?.();if(generation===this.generation)this.start();})().catch(()=>this.schedule(forceRefresh));
  },Math.min(30000,500*2**Math.min(this.retries++,6))*(0.75+Math.random()*0.5));
 }
 private start(){
  if(!this.enabled||!this.url||!this.foreground||!this.credentials||this.socket)return;
  if(this.credentials.expiresAt<=Date.now()){this.schedule(true);return;}
  let origin:string;try{origin=new URL(this.url).origin;}catch{return;}
  // RN synthesizes a browser Origin by default. Native sends an empty Origin;
  // browser WebSocket ignores extraHeaders and remains subject to the server allowlist.
  const socket=this.socket=this.factory(origin,{path:'/v1/realtime/socket.io',transports:['websocket'],auth:{token:this.credentials.token},autoConnect:false,reconnection:false,timeout:5000,...(Platform.OS!=='web'?{extraHeaders:{Origin:''}}:{})});
  socket.on('domain.event',(event:DomainEvent)=>{
   if(!event||typeof event.event_id!=='string'||typeof event.type!=='string'||!Number.isSafeInteger(event.aggregate_version)||!event.data||this.seen.has(event.event_id))return;
   this.seen.add(event.event_id);if(this.seen.size>2048)this.seen.delete(this.seen.values().next().value!);
   this.signal({kind:'event',event});
  });
  socket.on('access.revoked',(resource:Resource)=>{if(resource&&this.resources.has(resource.type+':'+resource.id))this.signal({kind:'revoked',resource});});
  socket.on('resync.required',()=>this.signal({kind:'sync'}));
  socket.on('connect',()=>{this.connected=true;this.retries=0;for(const {resource} of this.resources.values())this.subscribe(resource);this.signal({kind:'sync'});});
  socket.on('disconnect',(reason:string)=>{this.stop();this.schedule(reason==='io server disconnect');});
  socket.on('connect_error',(error:Error)=>{this.stop();this.schedule(error.message==='UNAUTHENTICATED');});
  this.expiry=setTimeout(()=>{this.stop();this.schedule(true);},Math.max(1,this.credentials.expiresAt-Date.now()));
  socket.connect();
 }
 dispose(){this.stop();this.credentials=null;this.resources.clear();this.seen.clear();}
}
