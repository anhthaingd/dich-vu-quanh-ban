import {Platform} from 'react-native';
const mockRegister=jest.fn(),mockStart=jest.fn(),mockStop=jest.fn(),mockConfig=jest.fn(),mockOutput=jest.fn(),mockTrackStop=jest.fn(),mockGetUserMedia=jest.fn();
const mockRoomConnect=jest.fn(),mockDisconnect=jest.fn(),mockMic=jest.fn(),mockOn=jest.fn(),mockRemove=jest.fn();
jest.mock('@livekit/react-native',()=>({registerGlobals:()=>mockRegister(),AudioSession:{configureAudio:(...args:unknown[])=>mockConfig(...args),startAudioSession:()=>mockStart(),stopAudioSession:()=>mockStop(),selectAudioOutput:(id:string)=>mockOutput(id)}}));
jest.mock('@livekit/react-native-webrtc',()=>({mediaDevices:{getUserMedia:(...args:unknown[])=>mockGetUserMedia(...args)}}));
jest.mock('livekit-client',()=>({Room:jest.fn(()=>({connect:mockRoomConnect,disconnect:mockDisconnect,localParticipant:{setMicrophoneEnabled:mockMic},on:mockOn,removeAllListeners:mockRemove})),RoomEvent:{Disconnected:'disconnected',Reconnecting:'reconnecting',Reconnected:'reconnected'}}));
// Import the native implementation explicitly; general UI suites mock its boundary.
const native=jest.requireActual('./media.native') as typeof import('./media.native');
const credentials={call_id:'call',token:'TEST_ONLY',url:'ws://127.0.0.1:7880',expires_at:'2099-01-01T00:00:00Z'};
beforeEach(()=>{for(const f of [mockStart,mockStop,mockConfig,mockOutput,mockTrackStop,mockGetUserMedia,mockRoomConnect,mockDisconnect,mockMic,mockOn,mockRemove])f.mockReset().mockResolvedValue(undefined);mockGetUserMedia.mockResolvedValue({getTracks:()=>[{stop:mockTrackStop}]});});
test('permission probe requests only microphone and immediately releases its stream',async()=>{await native.prepareMicrophone();expect(mockGetUserMedia).toHaveBeenCalledWith({audio:true,video:false});expect(mockTrackStop).toHaveBeenCalledTimes(1);});
test('iOS media starts voice audio, uses supported speaker IDs and releases the native session',async()=>{
 Object.defineProperty(Platform,'OS',{configurable:true,value:'ios'});const media=native.createMediaSession();const status=jest.fn();await media.connect(credentials,status);expect(mockRoomConnect).toHaveBeenCalledWith(credentials.url,credentials.token);expect(mockStart).toHaveBeenCalledTimes(1);expect(mockMic).toHaveBeenCalledWith(true);await media.speaker(true);expect(mockOutput).toHaveBeenLastCalledWith('force_speaker');await media.speaker(false);expect(mockOutput).toHaveBeenLastCalledWith('default');await media.mute(true);expect(mockMic).toHaveBeenLastCalledWith(false);await media.close();expect(mockDisconnect).toHaveBeenCalledWith(true);expect(mockStop).toHaveBeenCalledTimes(1);
});
test('Android emulator maps local signaling and uses Android speaker routing',async()=>{
 Object.defineProperty(Platform,'OS',{configurable:true,value:'android'});const media=native.createMediaSession();await media.connect(credentials,jest.fn());expect(mockRoomConnect).toHaveBeenCalledWith('ws://10.0.2.2:7880',credentials.token);await media.speaker(true);expect(mockOutput).toHaveBeenCalledWith('speaker');await media.speaker(false);expect(mockOutput).toHaveBeenCalledWith('earpiece');await media.close();
});
