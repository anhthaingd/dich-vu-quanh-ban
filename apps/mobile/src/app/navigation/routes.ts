import type {ReportContext} from '../../features/support/models';
type SimpleDestination = 'Support' | 'Notifications' | 'NotificationSettings' | 'Organizations' | 'VerifyContact' | 'Profile' | 'Sessions' | 'Addresses' | 'Partners' | 'Jobs' | 'Conversations';
type ResourceScreen = 'JobDetail' | 'Invoice' | 'Reviews' | 'Conversation' | 'Support' | 'PartnerProfile' | 'Finance' | 'Team' | 'Verification';
export type AccountDestination = SimpleDestination | {screen:ResourceScreen;params:{id:string}} | {screen:'JobCreate';params:{partnerId:string}} | {screen:'Conversations';params:{jobId:string}};
const simple = new Set<string>(['Support','Notifications','NotificationSettings','Organizations','VerifyContact','Profile','Sessions','Addresses','Partners','Jobs','Conversations']);
const resources = new Set<string>(['JobDetail','Invoice','Reviews','Conversation','Support','PartnerProfile','Finance','Team','Verification']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Navigation carries identity only. Never retain credentials, drafts or an action to replay.
export function accountDestination(value:unknown):AccountDestination|null {
 if(typeof value==='string'){
  if(simple.has(value))return value as SimpleDestination;
  const match=/^dvqb:\/\/(partners|jobs|conversations|support)\/([^/?#%]+)(?:\/(hire|invoice|reviews))?$/.exec(value);
  if(!match||!uuid.test(match[2]!))return null;
  const [,kind,id,child]=match;
  if(kind==='partners'&&child==='hire')return {screen:'JobCreate',params:{partnerId:id!}};
  const screen:ResourceScreen|undefined=kind==='partners'&&!child?'PartnerProfile':kind==='jobs'?(!child?'JobDetail':child==='invoice'?'Invoice':child==='reviews'?'Reviews':undefined):kind==='conversations'&&!child?'Conversation':kind==='support'&&!child?'Support':undefined;
  return screen?{screen,params:{id:id!}}:null;
 }
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(Object.keys(v).length!==2||typeof v.screen!=='string'||!v.params||typeof v.params!=='object'||Array.isArray(v.params))return null;
 const params=v.params as Record<string,unknown>,key=v.screen==='JobCreate'?'partnerId':v.screen==='Conversations'?'jobId':'id';
 if(Object.keys(params).length!==1||typeof params[key]!=='string'||!uuid.test(params[key]))return null;
 if(v.screen==='Conversations')return {screen:'Conversations',params:{jobId:params[key]}};
 if(v.screen==='JobCreate')return {screen:'JobCreate',params:{partnerId:params[key]}};
 return resources.has(v.screen)?{screen:v.screen as ResourceScreen,params:{id:params[key]}}:null;
}
export function destinationRoute(destination:AccountDestination){
 return typeof destination==='string'?{name:destination}:{name:destination.screen,params:destination.params};
}
// React Navigation uses the same parser for initial URLs and URLs received while open.
export function appLinkState(path:string){
 const destination=accountDestination('dvqb://'+path);
 return destination?{routes:[destinationRoute(destination)]}:undefined;
}
export type RootStackParamList = {
  AccountSecurity: undefined;
  AccountRecovery: undefined;
  Finance: {id:string};
  Verification: {id:string};
  Support: {id?:string;context?:ReportContext}|undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Organizations: undefined;
  VerifyContact: undefined;
  Team: {id:string};
  Jobs: undefined;
  JobCreate: {partnerId:string};
  JobDetail: {id:string};
  Invoice: {id:string};
  Reviews: {id:string};
  Conversations: {jobId?:string}|undefined;
  Conversation: {id:string;jobId?:string};
  CatalogHome: undefined;
  CatalogCategory: { categoryId: string; parentId: string | null };
  Account: { returnTo?: AccountDestination } | undefined;
  Profile: undefined;
  Sessions: undefined;
  Addresses: undefined;
  Partners: undefined;
  PartnerEditor: {id?:string};
  PartnerProfile: {id:string};
  Search: {skillId?:string;categoryId?:string};
};
