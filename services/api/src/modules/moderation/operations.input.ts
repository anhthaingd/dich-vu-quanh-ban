import {identifier} from '../accounts/accounts.input.js';
import {body,invalid,reasonRule,rethrow,text,version} from './moderation.input.js';
export type OperationDomain='users'|'partners'|'categories'|'skills';
export function operationInput(value:unknown,d:OperationDomain,create=false){
 const catalog=d==='categories'||d==='skills';
 const v=body(value,catalog?['expected_version','code','name_vi','parent_id','category_ids','active','reason']:['expected_version','action','reason']);
 if(!create)version(v.expected_version);
 if(create&&v.expected_version!==undefined)throw invalid('ADMIN_CATALOG_CREATE_VERSION_UNEXPECTED','expected_version');
 const reason=text(v.reason,1000,reasonRule);
 if(!catalog){
  const actions=d==='users'?['suspend_all','restore']:['warn','suspend_new','restore'];
  if(!actions.includes(String(v.action)))throw invalid('ADMIN_DECISION_INVALID','action');
  return {expected_version:Number(v.expected_version),reason,action:String(v.action)};
 }
 if(create&&(typeof v.code!=='string'||!/^[a-z][a-z0-9_]{0,79}$/.test(v.code)))throw invalid('ADMIN_CATALOG_CODE_INVALID','code');
 if(!create&&(v.code!==undefined||v.parent_id!==undefined||v.category_ids!==undefined))throw invalid('ADMIN_CATALOG_FIELD_NOT_EDITABLE',v.code!==undefined?'code':v.parent_id!==undefined?'parent_id':'category_ids');
 if((!create||v.active!==undefined)&&typeof v.active!=='boolean')throw invalid('ADMIN_CATALOG_ACTIVE_INVALID','active');
 if(d==='categories'&&v.category_ids!==undefined||d==='skills'&&v.parent_id!==undefined)throw invalid('ADMIN_CATALOG_FIELD_NOT_ALLOWED',d==='categories'?'category_ids':'parent_id');
 const parent=v.parent_id===undefined?null:rethrow('ADMIN_CATALOG_PARENT_INVALID','parent_id',()=>identifier(v.parent_id));
 let categories:string[]=[];
 if(d==='skills'&&create){
  if(!Array.isArray(v.category_ids)||v.category_ids.length!==1)throw invalid('ADMIN_CATALOG_SKILL_CATEGORY_REQUIRED','category_ids');
  categories=v.category_ids.map(c=>rethrow('ADMIN_CATALOG_SKILL_CATEGORY_INVALID','category_ids',()=>identifier(c)));
 }
 return {expected_version:create?0:Number(v.expected_version),reason,name_vi:text(v.name_vi,200,{prefix:'ADMIN_CATALOG_NAME',field:'name_vi'}),code:create?String(v.code):undefined,
  parent_id:parent,category_ids:categories,active:v.active===undefined?true:v.active,action:create?'create':'edit'};
}
