import {AccessToken,RoomServiceClient} from 'livekit-server-sdk';
import {randomUUID} from 'node:crypto';
export const mediaPrefix=c=>`dvqb-lab-${c.expected_account_id}-${c.lab_id}-call-`;
export function mediaCredentials(c,env=process.env){
 if(!c.livekit_url)return undefined;
 if(!env.LIVEKIT_API_KEY||(env.LIVEKIT_API_SECRET?.length??0)<32)throw Error('Load LIVEKIT_API_KEY and LIVEKIT_API_SECRET privately before operating this lab.');
 return {url:c.livekit_url,apiKey:env.LIVEKIT_API_KEY,apiSecret:env.LIVEKIT_API_SECRET};
}
export async function checkMedia(c,env=process.env,transport=fetch){
 const config=mediaCredentials(c,env);if(!config)return;
 const token=new AccessToken(config.apiKey,config.apiSecret,{identity:'dvqb-policy-probe',ttl:5});
 token.addGrant({roomJoin:true,room:`dvqb-policy-probe-${randomUUID()}`,roomCreate:false,canPublish:false,canSubscribe:false,canPublishData:false});
 const r=await transport(config.url.replace(/^ws/,'http')+'/rtc/validate',{headers:{Authorization:'Bearer '+await token.toJwt()},signal:globalThis.AbortSignal.timeout(5000)});
 if(r.status!==404||(await r.text()).trim()!=='requested room does not exist')throw Error('LIVEKIT_EXPLICIT_ROOMS_REQUIRED: disable automatic room creation in the dedicated project; deployment is blocked until its policy probe passes.');
}
export async function cleanMedia(c,env=process.env,rooms,transport=fetch){
 const config=mediaCredentials(c,env);if(!config)return;
 await checkMedia(c,env,transport);
 rooms??=new RoomServiceClient(config.url.replace(/^ws/,'http'),config.apiKey,config.apiSecret);
 const prefix=mediaPrefix(c);
 // API/ops tasks must already be stopped. Only this account/lab namespace is owned.
 const owned=(await rooms.listRooms()).filter(r=>r.name.startsWith(prefix));
 for(const room of owned){
  for(const p of await rooms.listParticipants(room.name))await rooms.removeParticipant(room.name,p.identity,{revokeTokenTs:BigInt(Math.floor(Date.now()/1000)+30)});
  await rooms.deleteRoom(room.name);
 }
 if((await rooms.listRooms()).some(r=>r.name.startsWith(prefix)))throw Error('LiveKit lab rooms remain; cleanup incomplete.');
}
