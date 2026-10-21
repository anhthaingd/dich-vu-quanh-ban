import type {MediaToken} from './models';
export type MediaStatus='connected'|'reconnecting'|'failed'|'audioError';
export interface CallMediaSession {connect(credentials:MediaToken,status:(value:MediaStatus)=>void):Promise<void>;mute(value:boolean):Promise<void>;speaker(value:boolean):Promise<void>;resume():Promise<void>;close():Promise<void>;supportsSpeaker:boolean;}
