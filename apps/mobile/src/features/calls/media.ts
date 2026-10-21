import {Room,RoomEvent,Track} from 'livekit-client';
import type {MediaToken} from './models';
import type {CallMediaSession,MediaStatus} from './media.types';
export async function prepareMicrophone(){const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});stream.getTracks().forEach(t=>t.stop());}
export function createMediaSession():CallMediaSession {
 const room=new Room();const elements=new Set<HTMLMediaElement>();let closed=false;
 return {supportsSpeaker:false,
  async connect(credentials:MediaToken,status:(s:MediaStatus)=>void){
   room.on(RoomEvent.TrackSubscribed,track=>{if(track.kind!==Track.Kind.Audio)return;const el=track.attach();el.autoplay=true;el.style.display='none';document.body.appendChild(el);elements.add(el);void el.play().catch(()=>{if(!closed)status('audioError');});});
   room.on(RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(el=>{el.remove();elements.delete(el);}));
   room.on(RoomEvent.Disconnected,()=>{if(!closed)status('failed');});room.on(RoomEvent.Reconnecting,()=>{if(!closed)status('reconnecting');});room.on(RoomEvent.Reconnected,()=>{if(!closed)status('connected');});
   await room.connect(credentials.url,credentials.token);if(closed){await room.disconnect();return;}
   await room.localParticipant.setMicrophoneEnabled(true);await room.startAudio();status('connected');
  },
  async mute(value){await room.localParticipant.setMicrophoneEnabled(!value);},async speaker(){},async resume(){await room.startAudio();await Promise.all([...elements].map(el=>el.play()));},
  async close(){closed=true;await room.disconnect(true);for(const el of elements){el.pause();el.srcObject=null;el.remove();}elements.clear();room.removeAllListeners();}
 };
}
