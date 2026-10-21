import {isFinanceItem,isFinancePage} from './finance-api';
import {record} from '../../jobs/api/jobs-api';
import type {FinanceDomain} from '../models';
export type FinanceRequest=<T>(path:string,validate:(v:unknown)=>v is T,body?:unknown,key?:string,method?:'POST'|'PUT')=>Promise<T>;
export class FinanceAdminApi {
 constructor(private request:FinanceRequest){}
 list(d:FinanceDomain,q:string,state:string,cursor?:string){return this.request('/admin/'+d+'?'+new URLSearchParams({q,state,...(cursor?{cursor}:{})}),isFinancePage);}
 detail(d:FinanceDomain,id:string){return this.request('/admin/'+d+'/'+id,isFinanceItem);}
 decision(d:FinanceDomain,id:string,input:unknown,key:string){return this.request('/admin/'+d+'/'+id+'/decision',isFinanceItem,input,key);}
 deposit(input:{partner_id:string;amount:string;reference:string},key:string){return this.request('/admin/finance-simulator/deposits',(v):v is {state:'recorded'}=>record(v)&&v.state==='recorded',input,key);}
}
