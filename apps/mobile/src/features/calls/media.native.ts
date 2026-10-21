import {AudioSession,registerGlobals} from '@livekit/react-native';
import {mediaDevices} from '@livekit/react-native-webrtc';
import {Platform} from 'react-native';
import {Room,RoomEvent} from 'livekit-client';
import type {MediaToken} from './models';
import type {CallMediaSession,MediaStatus} from './media.types';
registerGlobals();
export async function prepareMicrophone(){const stream=await mediaDevices.getUserMedia({audio:true,video:false});stream.getTracks().forEach(t=>t.stop());}
export function createMediaSession():CallMediaSession {
 const room=new Room();let closed=false;
 return {supportsSpeaker:true,
  async connect(credentials:MediaToken,status:(s:MediaStatus)=>void){
   await AudioSession.configureAudio({android:{preferredOutputList:['bluetooth','headset','earpiece','speaker'],audioTypeOptions:{audioMode:'inCommunication',audioFocusMode:'gain',audioStreamType:'voiceCall',audioAttributesUsageType:'voiceCommunication',audioAttributesContentType:'speech',manageAudioFocus:true}},ios:{defaultOutput:'earpiece'}});
   await AudioSession.startAudioSession();
   room.on(RoomEvent.Disconnected,()=>{if(!closed)status('failed');});room.on(RoomEvent.Reconnecting,()=>{if(!closed)status('reconnecting');});room.on(RoomEvent.Reconnected,()=>{if(!closed)status('connected');});
   const url=Platform.OS==='android'?credentials.url.replace(/^(wss?:\/\/)(127\.0\.0\.1|localhost)(?=[:/]|$)/,'$110.0.2.2'):credentials.url;await room.connect(url,credentials.token);if(closed){await room.disconnect();return;}await room.localParticipant.setMicrophoneEnabled(true);status('connected');
  },
  async mute(value){await room.localParticipant.setMicrophoneEnabled(!value);},async speaker(value){await AudioSession.selectAudioOutput(Platform.OS==='ios'?(value?'force_speaker':'default'):(value?'speaker':'earpiece'));},async resume(){await AudioSession.startAudioSession();},
  async close(){closed=true;try{await room.disconnect(true);}finally{room.removeAllListeners();await AudioSession.stopAudioSession();}}
 };
}
