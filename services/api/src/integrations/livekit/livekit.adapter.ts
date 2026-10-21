import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import {randomUUID} from 'node:crypto';
export type CallsConfig = {url:string;apiKey:string;apiSecret:string};
export interface CallMedia {
 token(room:string,user:string):Promise<{token:string;url:string;expires_at:string}>;
 close(room:string):Promise<void>;
}
export const roomName=(id:string)=>`dvqb-call-${id}`;
// Server credentials stay here. Token grants cannot publish camera, screen or data.
export class LiveKitMedia implements CallMedia {
 private readonly rooms:RoomServiceClient;
 constructor(private readonly config:CallsConfig){this.rooms=new RoomServiceClient(config.url.replace(/^ws/,'http'),config.apiKey,config.apiSecret);}
 private async requireExplicitRooms(){
  // Probe the pinned server policy without creating a room. A normal --dev
  // instance returns 200 here and is deliberately rejected as unsafe.
  const probe=new AccessToken(this.config.apiKey,this.config.apiSecret,{identity:'dvqb-policy-probe',ttl:5});
  probe.addGrant({roomJoin:true,room:`dvqb-policy-probe-${randomUUID()}`,roomCreate:false,canPublish:false,canSubscribe:false,canPublishData:false});
  const response=await fetch(this.config.url.replace(/^ws/,'http')+'/rtc/validate',{headers:{Authorization:'Bearer '+await probe.toJwt()},signal:AbortSignal.timeout(3000)});
  if(response.status!==404||(await response.text()).trim()!=='requested room does not exist')throw new Error('LIVEKIT_EXPLICIT_ROOMS_REQUIRED');
 }
 async token(room:string,user:string){
  await this.requireExplicitRooms();
  await this.rooms.createRoom({name:room,maxParticipants:2,emptyTimeout:30,departureTimeout:5});
  const token=new AccessToken(this.config.apiKey,this.config.apiSecret,{identity:user,ttl:30});
  token.addGrant({roomJoin:true,room,roomCreate:false,canPublish:true,canPublishSources:[TrackSource.MICROPHONE],canSubscribe:true,canPublishData:false,canUpdateOwnMetadata:false});
  return {token:await token.toJwt(),url:this.config.url,expires_at:new Date(Date.now()+30000).toISOString()};
 }
 async close(room:string){
  try{await this.rooms.deleteRoom(room);}catch(e){if((e as {code?:string}).code!=='not_found')throw e;}
 }
}
