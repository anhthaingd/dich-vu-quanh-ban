import {BadRequestException} from '@nestjs/common';
import {identifier,object} from '../accounts/accounts.input.js';
import {text} from './moderation.input.js';
export type OperationDomain='users'|'partners'|'categories'|'skills';
export function operationInput(body:unknown,d:OperationDomain,create=false){
 const catalog=d==='categories'||d==='skills';
 const v=object(body,catalog?['expected_version','code','name_vi','parent_id','category_ids','active','reason']:['expected_version','action','reason']);
 if(!create&&(!Number.isSafeInteger(v.expected_version)||Number(v.expected_version)<1))throw new BadRequestException();
 if(create&&v.expected_version!==undefined)throw new BadRequestException();
 const reason=text(v.reason,1000);
 if(!catalog){
  const actions=d==='users'?['suspend_all','restore']:['warn','suspend_new','restore'];
  if(!actions.includes(String(v.action)))throw new BadRequestException();
  return {expected_version:Number(v.expected_version),reason,action:String(v.action)};
 }
 if(create&&(typeof v.code!=='string'||!/^[a-z][a-z0-9_]{0,79}$/.test(v.code)))throw new BadRequestException();
 if(!create&&(v.code!==undefined||v.parent_id!==undefined||v.category_ids!==undefined))throw new BadRequestException();
 if((!create||v.active!==undefined)&&typeof v.active!=='boolean')throw new BadRequestException();
 if(d==='categories'&&v.category_ids!==undefined||d==='skills'&&v.parent_id!==undefined)throw new BadRequestException();
 const parent=v.parent_id===undefined?null:identifier(v.parent_id);
 let categories:string[]=[];
 if(d==='skills'&&create){
  if(!Array.isArray(v.category_ids)||v.category_ids.length!==1)throw new BadRequestException();
  categories=v.category_ids.map(identifier);
 }
 return {expected_version:create?0:Number(v.expected_version),reason,name_vi:text(v.name_vi,200),code:create?String(v.code):undefined,
  parent_id:parent,category_ids:categories,active:v.active===undefined?true:v.active,action:create?'create':'edit'};
}
