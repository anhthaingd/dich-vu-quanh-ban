import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import {randomUUID} from 'node:crypto';
export type CallsConfig = {url:string;apiKey:string;apiSecret:string;mode?:'local'|'cloud';roomPrefix?:string};
export interface CallMedia {
 token(room:string,user:string):Promise<{token:string;url:string;expires_at:string}>;
 close(room:string,users?:string[]):Promise<void>;
}
export const roomName=(id:string)=>`dvqb-call-${id}`;
// Server credentials stay here. Token grants cannot publish camera, screen or data.
export class LiveKitMedia implements CallMedia {
 private readonly rooms:RoomServiceClient;
 constructor(private readonly config:CallsConfig,rooms?:RoomServiceClient,private readonly transport:typeof fetch=fetch){this.rooms=rooms??new RoomServiceClient(config.url.replace(/^ws/,'http'),config.apiKey,config.apiSecret);}
 private physicalRoom(room:string){
  if(this.config.mode!=='cloud')return room;
  if(!this.config.roomPrefix||!/^dvqb-call-[a-f0-9-]{36}$/.test(room))throw new Error('Invalid cloud call room');
  return this.config.roomPrefix+room.slice('dvqb-call-'.length);
 }
 async requireExplicitRooms(){
  // Probe the pinned server policy without creating a room. A normal --dev
  // instance returns 200 here and is deliberately rejected as unsafe.
  const probe=new AccessToken(this.config.apiKey,this.config.apiSecret,{identity:'dvqb-policy-probe',ttl:5});
  probe.addGrant({roomJoin:true,room:`dvqb-policy-probe-${randomUUID()}`,roomCreate:false,canPublish:false,canSubscribe:false,canPublishData:false});
  const response=await this.transport(this.config.url.replace(/^ws/,'http')+'/rtc/validate',{headers:{Authorization:'Bearer '+await probe.toJwt()},signal:AbortSignal.timeout(3000)});
  if(response.status!==404||(await response.text()).trim()!=='requested room does not exist')throw new Error('LIVEKIT_EXPLICIT_ROOMS_REQUIRED');
 }
 async token(room:string,user:string){
  await this.requireExplicitRooms();
  room=this.physicalRoom(room);
  await this.rooms.createRoom({name:room,maxParticipants:2,emptyTimeout:30,departureTimeout:5});
  const token=new AccessToken(this.config.apiKey,this.config.apiSecret,{identity:user,ttl:30});
  token.addGrant({roomJoin:true,room,roomCreate:false,canPublish:true,canPublishSources:[TrackSource.MICROPHONE],canSubscribe:true,canPublishData:false,canUpdateOwnMetadata:false});
  return {token:await token.toJwt(),url:this.config.url,expires_at:new Date(Date.now()+30000).toISOString()};
 }
 async close(room:string,users?:string[]){
  room=this.physicalRoom(room);
  if(this.config.mode==='cloud'){
   await this.requireExplicitRooms();
   if(!(await this.rooms.listRooms([room])).length)return;
   if(!users?.length)throw new Error('Cloud cleanup requires durable participant identities');
   // Include disconnected/never-joined identities. Future cutoff covers tokens
   // refreshed in the same second; explicit-room policy remains the final barrier.
   for(const user of new Set(users))await this.rooms.removeParticipant(room,user,{revokeTokenTs:BigInt(Math.floor(Date.now()/1000)+30)});
  }
  try{await this.rooms.deleteRoom(room);}catch(e){if((e as {code?:string}).code!=='not_found')throw e;}
 }
}
