import type {Call} from './models';
export type NativeCallAction={id:string;owner:string;action:'open'|'accept'|'decline'|'end'};
export type AndroidCallUi={available:boolean;configure:(owner:string|null,locale:string)=>Promise<void>;consumeAction:()=>Promise<NativeCallAction|null>;start:(call:Call,owner:string,token:string)=>Promise<void>;updateToken:(id:string,token:string)=>Promise<void>;running:(id:string)=>Promise<boolean>;stop:(id:string)=>Promise<void>};
export const androidCallUi:AndroidCallUi={
 available:false,
 async configure(){},
 async consumeAction(){return null;},
 async start(){},
 async updateToken(){},
 async running(){return true;},
 async stop(){}
};
