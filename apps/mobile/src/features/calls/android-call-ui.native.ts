import {NativeModules,Platform} from 'react-native';
import type {Call} from './models';
import type {NativeCallAction} from './android-call-ui';
type Bridge={configure:(owner:string|null,locale:string)=>Promise<void>;consumeAction:()=>Promise<NativeCallAction|null>;start:(id:string,owner:string,base:string,token:string)=>Promise<void>;updateToken:(id:string,token:string)=>Promise<void>;running:(id:string)=>Promise<boolean>;stop:(id:string)=>Promise<void>};
const bridge=Platform.OS==='android'?NativeModules.DVQBAndroidCalls as Bridge|undefined:undefined;
export const androidCallUi={
 available:!!bridge,
 async configure(owner:string|null,locale:string){await bridge?.configure(owner,locale);},
 async consumeAction(){return await bridge?.consumeAction()??null;},
 async start(call:Call,owner:string,token:string){if(bridge)await bridge.start(call.id,owner,(process.env.EXPO_PUBLIC_API_URL??'').replace(/\/$/,''),token);},
 async updateToken(id:string,token:string){await bridge?.updateToken(id,token);},
 async running(id:string){return await bridge?.running(id)??true;},
 async stop(id:string){await bridge?.stop(id);}
};
