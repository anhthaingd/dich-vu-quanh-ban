import {workFixture,job} from './work';
import {AuthSession} from '../../src/features/auth/state/auth-session';
import type {InvoicesApi} from '../../src/features/invoices/api/invoices-api';
import type {Invoice,Asset} from '../../src/features/invoices/models';
export const invoice:Invoice={id:'invoice',job_id:'job',version:3,version_id:'v1',state:'sent',labor:'200000',materials:'50000',total:'250000',points_used:'0',cash_due:'250000',reward:'4000',customer_payment_reported_at:null,worker_receipt_confirmed_at:null,settled:false,review_eligible:false,result_asset_ids:['photo'],note:'DEMO work completed',revision_reason:null};
export const asset:Asset={id:'photo',status:'ready',download_url:'http://local/photo',expires_at:'2099-01-01T00:00:00Z'};
export function invoiceFixture(worker=false){
 const f=workFixture();let current={...invoice};
 f.jobs.get.mockResolvedValue({...job,state:'accepted',customer_id:worker?'customer':job.customer_id,allowed_actions:worker?['invoice']:[]});
 const invoices:jest.Mocked<InvoicesApi>={
  get:jest.fn().mockImplementation(async()=>current),
  save:jest.fn().mockImplementation(async(_token,_job,input)=>{current={...current,...input,state:'draft',version:current.version+1,version_id:'v2'};return current;}),
  change:jest.fn().mockImplementation(async(_token,_id,action,input)=>{current={...current,version:current.version+1,...(action==='send'?{state:'sent'}:action==='revision-requests'?{state:'revision_requested',revision_reason:input.reason}:action==='confirm'?{state:'locked',points_used:input.points_used,cash_due:String(BigInt(current.total)-BigInt(input.points_used))}:action==='settle'?{state:'settled',settled:true,worker_receipt_confirmed_at:'2026-10-08T00:00:00Z'}:{customer_payment_reported_at:'2026-10-08T00:00:00Z'})};return current;}),
  points:jest.fn().mockResolvedValue({balance:'80000',held:'0',available:'80000'}),
  wallet:jest.fn().mockResolvedValue({partner_id:'partner',balance:'30000',fee_holds:'0',withdrawal_holds:'0',withdrawable:'30000',fee_credit_limit:'100000',shortfall:'0'}),
  ledger:jest.fn().mockResolvedValue({items:[],next_cursor:null}),
  upload:jest.fn().mockResolvedValue(asset),asset:jest.fn().mockResolvedValue(asset),
 };
 return {...f,invoices,setInvoice:(i:Invoice)=>{current=i;},manager:new AuthSession(f.api,f.storage,f.accounts,f.partners,f.jobs,f.chat,invoices)};
}
