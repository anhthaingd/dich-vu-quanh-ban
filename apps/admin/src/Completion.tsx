import {useEffect,useRef,useState} from 'react';
import {AdminClient,ClientError,type Item,type CompletionPreview} from './client';
export function Completion({item,client,t,locale,fail,reload}:{item:Item;client:AdminClient;t:(k:string)=>string;locale:string;fail:(e:unknown)=>void;reload:()=>void}){
 const [preview,setPreview]=useState<CompletionPreview|null>(null),[reason,setReason]=useState(''),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[expired,setExpired]=useState(false),[done,setDone]=useState(false);
 const pending=useRef<{input:unknown;key:string}|null>(null),live=useRef(true),sending=useRef(false);
 const evidence=[...new Set([...(item.evidence_ids??[]),...(item.updates??[]).flatMap(u=>u.evidence_ids)])];
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(!preview)return;const timer=setTimeout(()=>setExpired(true),Math.max(0,Date.parse(preview.expires_at)-Date.now()));return()=>clearTimeout(timer);},[preview]);
 const handle=(e:unknown)=>{const c=e instanceof ClientError?e.code:'NETWORK';setError(c);if(['FORBIDDEN','REAUTH_REQUIRED','UNAUTHENTICATED'].includes(c))fail(e);return c;};
 const load=async()=>{if(sending.current)return;sending.current=true;setBusy(true);setError('');try{const p=await client.completionPreview(item.id);if(live.current){setPreview(p);setExpired(false);}}catch(e){if(live.current)handle(e);}finally{sending.current=false;if(live.current)setBusy(false);}};
 const submit=async()=>{if(sending.current||!preview||!pending.current&&(expired||!checked||!reason.trim()))return;sending.current=true;
  const task=pending.current??{key:crypto.randomUUID(),input:{expected_version:item.version,invoice_id:preview.invoice_id,invoice_version_id:preview.invoice_version_id,invoice_expected_version:preview.invoice_expected_version,reason:reason.trim(),evidence_ids:evidence,preview_token:preview.preview_token,checked:true}};
  pending.current=task;setBusy(true);setError('');try{await client.complete(item.id,task.input,task.key);if(live.current){pending.current=null;setDone(true);reload();}}catch(e){if(live.current){const c=handle(e);if(!['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL','INVALID_RESPONSE'].includes(c))pending.current=null;}}finally{sending.current=false;if(live.current)setBusy(false);}
 };
 if(done)return <p role="status">{t('completionDone')}</p>;
 const conflict=['VERSION_CONFLICT','STATE_CONFLICT'].includes(error);
 return <section className="completion" data-testid="admin-completion"><h3>{t('completion')}</h3><p className="note">{t('completionHint')}</p>
 {preview&&<><dl>{(['total','cash_due','fee','points_used','reward','partner_delta'] as const).map(k=><div key={k}><dt>{t(k)}</dt><dd>{new Intl.NumberFormat(locale).format(BigInt(preview[k]))}{['points_used','reward'].includes(k)?' point':' ₫'}</dd></div>)}</dl><small>{t('completionExpires')}: {new Date(preview.expires_at).toLocaleTimeString(locale)}</small><p>{t('completionEvidence')}: {evidence.length}</p>
 <label>{t('completionReason')}<textarea data-testid="completion-reason" rows={4} maxLength={4000} value={reason} onChange={e=>setReason(e.target.value)} disabled={busy||!!pending.current}/></label>
 <label className="check"><input type="checkbox" data-testid="completion-checked" checked={checked} onChange={e=>setChecked(e.target.checked)} disabled={busy||!!pending.current}/>{t('completionChecked')}</label></>}
 {error&&<p role="alert">{t(conflict?'conflict':['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE','INTERNAL','INVALID_RESPONSE'].includes(error)?'network':'failed')}</p>}{expired&&!pending.current&&<p role="alert">{t('previewExpired')}</p>}
 {conflict||expired&&!pending.current?<button type="button" onClick={reload}>{t('refresh')}</button>:preview?<button type="button" data-testid="completion-confirm" disabled={busy||!pending.current&&(!checked||!reason.trim())} onClick={()=>void submit()}>{t(busy?'load':pending.current?'retry':'completionConfirm')}</button>:<button type="button" data-testid="completion-preview" disabled={busy} onClick={()=>void load()}>{t(busy?'load':'completionPreview')}</button>}
 </section>;
}
