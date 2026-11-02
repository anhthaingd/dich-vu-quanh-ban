import {usePageActions} from '../../../app/layout/ProductShell';
import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Image,Pressable,StyleSheet,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {AccountPage} from '../../accounts/components/AccountPage';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {Input} from '../../../components/ui/Input';
import {theme} from '../../../theme/tokens';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import {sessionReady,sessionOperation} from '../../jobs/state/session-ready';
import {Mutation} from '../../jobs/state/mutation';
import {JobFeedback} from '../../jobs/components/JobFeedback';
import type {Job} from '../../jobs/models';
import {formatInteger} from '../format-amount';
import type {Asset,LedgerPage,Invoice,InvoiceAction,InvoiceChange,Wallet} from '../models';
export function InvoiceScreen({navigation,route}:NativeStackScreenProps<RootStackParamList,'Invoice'>){return <AccountPage title="invoice.title" back={()=>navigation.goBack()} login={() => navigation.navigate('Account',{returnTo:{screen:'Invoice',params:{id:route.params.id}}})}>{owner=><InvoiceContent key={owner+route.params.id} owner={owner} id={route.params.id} report={invoice=>navigation.navigate('Support',{context:{kind:'invoice',job_id:route.params.id,invoice_id:invoice.id,invoice_version_id:invoice.version_id}})}/>}</AccountPage>;}
const validAmount=(v:string)=>/^(0|[1-9][0-9]*)$/.test(v);
function InvoiceContent({owner,id,report}:{owner:string;id:string;report:(invoice:Invoice)=>void}){
 const {manager,state:auth}=useAuth(),{t,locale}=useLocale();
 const [job,setJob]=useState<Job|null>(null),[invoice,setInvoice]=useState<Invoice|null>(null),[assets,setAssets]=useState<Asset[]>([]),[available,setAvailable]=useState<string|null>(null),[wallet,setWallet]=useState<Wallet|null>(null);
 const [photoError,setPhotoError]=useState(false),[photosBusy,setPhotosBusy]=useState(false),[financeError,setFinanceError]=useState(false),[financeBusy,setFinanceBusy]=useState(false);
 const financeReady=useRef(false);
 const [ledgerBusy,setLedgerBusy]=useState(false),[ledgerError,setLedgerError]=useState(false),[ledgerAttempt,setLedgerAttempt]=useState(0);
 const [ledger,setLedger]=useState<LedgerPage|null>(null),[history,setHistory]=useState(false);
 const [busy,setBusy]=useState(true),[error,setError]=useState<ApiErrorCode|null>(null),[attempt,setAttempt]=useState(0),[saved,setSaved]=useState(false);
 const [labor,setLabor]=useState(''),[materials,setMaterials]=useState(''),[note,setNote]=useState(''),[points,setPoints]=useState('0'),[reason,setReason]=useState(''),[revision,setRevision]=useState(false),[received,setReceived]=useState(false);
 const [mutation]=useState(()=>new Mutation<Invoice>()),[upload]=useState(()=>new Mutation<Asset>());
 const state=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot),up=useSyncExternalStore(upload.subscribe,upload.getSnapshot,upload.getSnapshot);
 const formVersion=useRef<string|null>(null),mounted=useRef(true);
 const readTask=useRef<Promise<void>>(Promise.resolve());
 const [stale,setStale]=useState(false);
 const edited=useRef(false),currentInvoice=useRef(invoice);currentInvoice.current=invoice;
 useRealtimeRefresh({error,resource:{type:'job',id},busy:busy||state.busy||state.pending||up.busy||up.pending,matches:s=>s.kind==='event'&&(s.event.data.job_id===id||s.event.type==='notification.created.v1'||s.event.type.startsWith('invoice.')&&(!invoice||s.event.data.invoice_id===invoice.id)),refresh:()=>setAttempt(v=>v+1),revoke:()=>{setJob(null);setInvoice(null);setAssets([]);setError('NOT_FOUND');}});
 useFocusEffect(useCallback(()=>{
  let active=true;mounted.current=true;setBusy(true);setError(null);
  readTask.current=(async()=>{
   const read=<T,>(work:()=>Promise<T>)=>sessionOperation(manager,owner,work,()=>active);
   const j=await read(()=>manager.getJob(owner,id));let i:Invoice|null=null;
   try{i=await read(()=>manager.getInvoice(owner,id));}catch(e){if(!(e instanceof ApiError)||e.code!=='NOT_FOUND')throw e;}
   if(!active)return;
   // Realtime is only an invalidation. A delayed/duplicate event must not lock
   // an edited form when HTTP still returns the version already displayed.
   const previous=currentInvoice.current;
   if(edited.current&&(previous?.version!==i?.version||previous?.version_id!==i?.version_id)){setStale(true);return;}
   setJob(j);setInvoice(i);
   // Reloading never silently replaces an edited draft or a customer's point choice.
   if(formVersion.current!==i?.version_id&&!edited.current){setLabor(i?.labor??'');setMaterials(i?.materials??'');setNote(i?.note??'');setPoints(i?.points_used??'0');setAssets((i?.result_asset_ids??[]).map(aid=>({id:aid,status:'ready',download_url:null,expires_at:null})));formVersion.current=i?.version_id??null;}
   // Financial state is independent: an unknown balance must never masquerade as zero.
   setFinanceBusy(true);setFinanceError(false);
   try {
    if(j.customer_id===owner){const pointWallet=await read(()=>manager.getPoints(owner));if(active){setAvailable(pointWallet.available);financeReady.current=true;}}
    else {try{const value=await read(()=>manager.getWallet(owner,j.partner_id));if(active){setWallet(value);financeReady.current=true;}}catch(e){if(e instanceof ApiError&&['NOT_FOUND','FORBIDDEN'].includes(e.code)){if(active){setWallet(null);financeReady.current=true;}}else throw e;}}
   } catch {if(active){setAvailable(null);setWallet(null);financeReady.current=false;setFinanceError(true);}}
   finally {if(active)setFinanceBusy(false);}
   if(!active)return;
   // Images are supplementary. Keep saved IDs even if their temporary URLs fail.
   // Resolve in a bounded serial queue because the account session serializes operations.
   setPhotosBusy(true);setPhotoError(false);
   void (async()=>{let failed=false;
    for(const aid of i?.result_asset_ids??[]){
     if(!active)return;
     try{const photo=await read(()=>manager.getAsset(owner,aid));if(active)setAssets(old=>old.map(a=>a.id===photo.id?photo:a));}
     catch{failed=true;}
    }
    if(active){setPhotoError(failed);setPhotosBusy(false);}
   })();
  })().catch(e=>{if(active){setError(e instanceof ApiError?e.code:'NETWORK');if(e instanceof ApiError&&['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(e.code)){setJob(null);setInvoice(null);setAssets([]);}}}).finally(()=>{if(active)setBusy(false);});
  return ()=>{active=false;mounted.current=false;};
 },[manager,owner,id,attempt]));
 useEffect(()=>{
  if(!history||!job||(!wallet&&job.customer_id!==owner))return;
  let active=true;setLedgerBusy(true);setLedgerError(false);
  void sessionOperation(manager,owner,()=>manager.getLedger(owner,job.customer_id===owner?undefined:job.partner_id),()=>active)
   .then(value=>{if(active)setLedger(value);})
   .catch(e=>{if(active){setLedgerError(true);if(e instanceof ApiError&&['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(e.code))setLedger(null);}})
   .finally(()=>{if(active)setLedgerBusy(false);});
  return()=>{active=false;};
 },[manager,owner,job,history,ledgerAttempt,wallet]);
 const draftBlocked=stale||state.busy||state.pending||up.busy||up.pending;
 const blocked=busy||auth.busy||draftBlocked;
 // Accept a press while a snapshot is loading. Keep its captured payload/key,
 // finish the whole read, then use the existing session/version-checked write.
 const afterRead=async<T,>(work:()=>Promise<T>):Promise<T>=>{
  let task:Promise<void>;do{task=readTask.current;await task;}while(task!==readTask.current);
  await sessionReady(manager,owner);
  if(!mounted.current)throw new ApiError('BUSY');
  return work();
 };
 const customer=job?.customer_id===owner,worker=job?.allowed_actions.includes('invoice');
 const editing=worker&&job?.state==='accepted'&&(!invoice||['draft','revision_requested'].includes(invoice.state));
 const locked=invoice?.state==='locked'||invoice?.state==='settled';
 const num=(n:string)=>formatInteger(n,locale);
 const money=(n:string)=>formatInteger(n,locale,true);
 let used=locked?invoice!.points_used:validAmount(points)?points:'0';
 if(invoice&&BigInt(used)>BigInt(invoice.total))used='0';
 const cash=invoice?String(BigInt(invoice.total)-BigInt(used)):'0';
 const reward=locked?invoice!.reward:invoice&&BigInt(invoice.total)>0n?String(BigInt(invoice.labor)*BigInt(cash)/(50n*BigInt(invoice.total))):'0';
 const apply=(i:Invoice|null)=>{if(!i||!mounted.current)return;edited.current=false;setStale(false);setInvoice(i);setSaved(false);setRevision(false);setReason('');setReceived(false);setAttempt(x=>x+1);};
 const act=async(action:InvoiceAction)=>{
  if(!invoice)return;setError(null);
  if(action==='confirm'&&(!financeReady.current||available===null||!validAmount(points)||BigInt(points)>BigInt(invoice.total)||BigInt(points)>BigInt(available))){setError('VALIDATION');return;}
  if(action==='revision-requests'&&!reason.trim()){setError('VALIDATION');return;}
  const input:InvoiceChange={expected_version:invoice.version,...(action==='send'?{draft_version_id:invoice.version_id}:action==='revision-requests'?{reason:reason.trim()}:{version_id:invoice.version_id}),...(action==='confirm'?{points_used:points}:{}),...(action==='payment-reported'?{confirmed:true as const}:{}),...(['settle','receipt-confirmed'].includes(action)?{received_in_full:true as const}:{})};
  apply(await mutation.run(key=>afterRead(()=>{if(action==='confirm'&&!financeReady.current)throw new ApiError('VALIDATION');return manager.changeInvoice(owner,invoice.id,action,input,key);})));
 };
 const save=async(send:boolean)=>{
  if(!validAmount(labor)||!validAmount(materials)||(send&&!assets.length)){setError('VALIDATION');return;}
  setError(null);setSaved(false);const input={expected_version:invoice?.version??1,labor,materials,note,result_asset_ids:assets.map(a=>a.id)};
  // A saved draft is retained within the retry closure, so a lost send response
  // never creates another draft/version on the next attempt.
  let draft:Invoice|null=null;
  const result=await mutation.run(key=>afterRead(async()=>{if(!draft)draft=await manager.saveInvoice(owner,id,input,key);return send?manager.changeInvoice(owner,draft.id,'send',{expected_version:draft.version,draft_version_id:draft.version_id},key):draft;}));
  apply(result);if(!result&&draft&&!mutation.getSnapshot().pending){setInvoice(draft);setAttempt(x=>x+1);}if(result&&!send)setSaved(true);
 };
 const picked=async()=>{
  setError(null);
  try{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(r.canceled||!r.assets[0]||!mounted.current)return;
   edited.current=true;const photo=r.assets[0];const blob=photo.file??await(await fetch(photo.uri)).blob();
   if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||blob.size>10*1024*1024||!blob.size){setError('VALIDATION');return;}
   const a=await upload.run(key=>manager.uploadResult(owner,blob,key));if(a&&mounted.current)setAssets(old=>[...old.filter(x=>x.id!==a.id),a]);
  }catch(e){if(mounted.current)setError(e instanceof ApiError?e.code:'NETWORK');}
 };
 const feedback=error??state.error??up.error;
 const special=feedback==='PARTNER_FUNDING_REQUIRED'?'invoice.funding':feedback==='INSUFFICIENT_POINTS'?'invoice.insufficient':feedback==='VALIDATION'?'invoice.invalid':null;
 const row=(label:string,value:string,kind?:'total'|'cash')=><View style={[styles.amount,kind==='total'&&styles.total,kind==='cash'&&styles.cash]}><AppText style={styles.amountLabel} tone={kind==='cash'?'surface':'text'}>{label}</AppText><AppText style={[styles.amountValue,kind==='total'&&styles.totalAmount,kind==='cash'&&styles.cashValue]} tone={kind==='cash'?'surface':'text'}>{value}</AppText></View>;
 const photos=<View style={styles.photos}>{assets.filter(a=>a.download_url).map(a=><Image key={a.id} testID="invoice-photo" source={{uri:a.download_url??undefined}} accessibilityLabel={t('invoice.photoAlt')} style={styles.photo} resizeMode="contain"/>)}</View>;
 const canConfirm=customer&&job?.state==='accepted'&&invoice?.state==='sent';
 const canReceive=!customer&&invoice&&(invoice.state==='locked'&&worker||invoice.settled&&!invoice.worker_receipt_confirmed_at&&job?.allowed_actions.includes('confirm_receipt'));
 usePageActions(job ? editing ? <><Button testID="invoice-send" label={t('invoice.send')} disabled={draftBlocked||!assets.length} onPress={()=>void save(true)}/><Button testID="invoice-save" label={t('invoice.save')} variant="secondary" disabled={draftBlocked} onPress={()=>void save(false)}/></> : invoice ? canConfirm ? revision ? <Button testID="invoice-revision-send" variant="primary" label={t('invoice.revisionSend')} disabled={draftBlocked||!reason.trim()} onPress={()=>void act('revision-requests')}/> : <Button testID="invoice-confirm" label={t('invoice.confirm')} disabled={draftBlocked||available===null||financeError} onPress={()=>void act('confirm')}/> : locked&&customer&&!invoice.customer_payment_reported_at ? <Button testID="invoice-paid" label={t(cash==='0'?'invoice.paidZero':'invoice.paid')} disabled={draftBlocked} onPress={()=>void act('payment-reported')}/> : canReceive ? <Button testID="invoice-receive" label={t(invoice.settled?'invoice.confirmReceipt':cash==='0'?'invoice.complete':'invoice.receive')} disabled={draftBlocked||!received} onPress={()=>void act(invoice.settled?'receipt-confirmed':'settle')}/> : null : null : null);
 return <>
  <AppText variant="caption" tone="muted">{t('invoice.test')}</AppText>

  {stale&&<AppText accessibilityRole="alert">{t('jobs.reloadBeforeRetry')}</AppText>}
  {busy&&!job&&<AppText>{t('accountTools.loading')}</AppText>}
  {special?<AppText accessibilityRole="alert" tone="error">{t(special)}</AppText>:<JobFeedback error={feedback} pending={state.pending||up.pending} busy={state.busy||up.busy||auth.busy} retry={state.pending?()=>void mutation.run().then(apply):up.pending?()=>void upload.run().then(a=>{if(a&&mounted.current)setAssets(old=>[...old.filter(x=>x.id!==a.id),a]);}):undefined}/>}
  {job&&<>

   {job.state==='stopped'&&<AppText tone="muted">{t('jobs.stopped')}</AppText>}
   {editing?<Card testID="invoice-editor" style={styles.panel}>
    <AppText variant="section">{t(invoice?.revision_reason?'invoice.edit':'invoice.editor')}</AppText>{invoice?.revision_reason&&<AppText style={styles.notice}>{t('invoice.revision',{reason:invoice.revision_reason})}</AppText>}
    <AppText variant="card">{t('invoice.costs')}</AppText>
    <Input testID="invoice-materials" label={t('invoice.materialInput')} value={materials} onChangeText={v=>{edited.current=true;setMaterials(v);}} keyboardType="number-pad" editable={!draftBlocked}/>
    <Input testID="invoice-labor" label={t('invoice.laborInput')} value={labor} onChangeText={v=>{edited.current=true;setLabor(v);}} keyboardType="number-pad" editable={!draftBlocked}/>
    <Input testID="invoice-note" label={t('invoice.note')} value={note} onChangeText={v=>{edited.current=true;setNote(v);}} multiline editable={!draftBlocked}/>
    <View>{row(t('invoice.total'),validAmount(labor)&&validAmount(materials)?money(String(BigInt(labor)+BigInt(materials))):'—','total')}</View>
    <View style={styles.photoInput}><AppText variant="card">{t('invoice.photos')}</AppText>{photos}<Button testID="invoice-pick" label={t('invoice.pick')} variant="secondary" disabled={blocked} onPress={()=>void picked()}/></View>
    {!assets.length&&<AppText variant="caption" tone="muted">{t('invoice.photosRequired')}</AppText>}
    <AppText variant="caption" tone="muted">{t('invoice.direct')}</AppText>{saved&&<AppText tone="success">{t('invoice.saved')}</AppText>}

   </Card>:invoice?<Card testID="invoice-review" style={styles.panel}>
    <View style={styles.invoiceTitle}><AppText tone="primary" style={styles.receipt}>▤</AppText><View style={styles.grow}><AppText variant="brand" tone="muted">{t('invoice.version',{version:invoice.version})}</AppText><AppText variant="section">{t(locked?'invoice.locked':'invoice.review')}</AppText></View></View>
    <View>{row(t('invoice.materials'),money(invoice.materials))}{row(t('invoice.labor'),money(invoice.labor))}{row(t('invoice.total'),money(invoice.total),'total')}</View>
    {invoice.state==='revision_requested'?<AppText style={styles.notice}>{t('invoice.revision',{reason:invoice.revision_reason??''})}</AppText>:<>
     {customer&&job.state==='accepted'&&!locked&&invoice.state==='sent'&&<View style={styles.points}><Input testID="invoice-points" label={t('invoice.points')} value={points} onChangeText={v=>{edited.current=true;setPoints(v);}} keyboardType="number-pad" editable={!draftBlocked}/><AppText variant="caption" tone="muted">{available===null?t('invoice.financeUnavailable'):t('invoice.available',{amount:num(available)})}</AppText><Button testID="invoice-max" variant="link" label={t('invoice.max')} disabled={draftBlocked||available===null||financeError} onPress={()=>{edited.current=true;setPoints(String(BigInt(available??'0')<BigInt(invoice.total)?BigInt(available??'0'):BigInt(invoice.total)));}}/></View>}
     {locked&&<AppText style={styles.notice}>{t('invoice.lockedHint')}</AppText>}
     {locked&&<View style={styles.paymentMarks}><AppText variant="card">{t('invoice.paymentMarks')}</AppText><AppText testID="invoice-customer-mark" tone={invoice.customer_payment_reported_at?'success':'muted'}>{invoice.customer_payment_reported_at?'✓':'◷'} {t('invoice.customerPaid')}</AppText><AppText testID="invoice-worker-mark" tone={invoice.worker_receipt_confirmed_at?'success':'muted'}>{invoice.worker_receipt_confirmed_at?'✓':'◷'} {t('invoice.workerPaid')}</AppText></View>}
     <View>{row(t('invoice.deduction'),'−'+money(used))}{row(t(customer?'invoice.cash':'invoice.cashWorker'),money(cash),'cash')}</View>
     <AppText variant="caption" tone="muted">{t(cash==='0'?'invoice.zero':customer?'invoice.payHint':'invoice.payHintWorker')}</AppText>
     {customer&&<View><AppText tone="success">{t(invoice.settled?'invoice.rewarded':'invoice.reward',{amount:num(reward)})}</AppText><AppText variant="caption" tone="muted">{t('invoice.rewardHint')}</AppText></View>}
     {customer&&job.state==='accepted'&&!locked&&invoice.state==='sent'&&<><AppText variant="caption" tone="muted">{t('invoice.confirmHint')}</AppText><Button testID="invoice-revise" variant="link" label={t('invoice.revise')} disabled={draftBlocked} onPress={()=>setRevision(v=>!v)}/>{revision&&<><Input testID="invoice-reason" label={t('invoice.reason')} value={reason} onChangeText={v=>{edited.current=true;setReason(v);}} multiline editable={!draftBlocked}/></> }</>}

     {!customer&&(invoice.state==='locked'&&worker||invoice.settled&&!invoice.worker_receipt_confirmed_at&&job.allowed_actions.includes('confirm_receipt'))&&<View style={styles.receive}>
      <Pressable testID="invoice-receive-check" accessibilityRole="checkbox" accessibilityState={{checked:received,disabled:draftBlocked}} disabled={draftBlocked} onPress={()=>setReceived(v=>!v)} style={styles.check}><AppText tone="primary">{received?'☑':'☐'}</AppText><AppText style={styles.grow}>{t(cash==='0'?'invoice.receiveZero':'invoice.receiveCheck')}</AppText></Pressable>

     </View>}
     {invoice.review_eligible?<AppText testID="invoice-done" style={styles.notice}>{t('invoice.done')}</AppText>:invoice.settled&&!invoice.worker_receipt_confirmed_at?<AppText testID="invoice-settled-separate" style={styles.notice}>{t('invoice.settledWithoutReceipt')}</AppText>:invoice.worker_receipt_confirmed_at?<AppText style={styles.notice}>{t('invoice.waitingCustomer')}</AppText>:invoice.customer_payment_reported_at?<AppText style={styles.notice}>{t('invoice.waitingWorker')}</AppText>:!customer&&invoice.state==='sent'?<AppText style={styles.notice}>{t('invoice.waitingReview')}</AppText>:null}
    </>}
   </Card>:<Card><AppText variant="section">{t('invoice.wait')}</AppText><AppText tone="muted">{t(customer?'invoice.waitHint':'invoice.assignedOnly')}</AppText></Card>}
   {financeError&&<Card><AppText testID="invoice-finance-error" accessibilityRole="alert" tone="error">{t('invoice.financeUnavailable')}</AppText><Button testID="invoice-finance-retry" label={t('invoice.retryFinance')} variant="secondary" disabled={busy||financeBusy||state.busy||state.pending} onPress={()=>setAttempt(v=>v+1)}/></Card>}
   {!editing&&invoice&&<Card><AppText variant="section">{t('invoice.photos')}</AppText>{photos}{!!invoice.note&&<AppText style={styles.notice}>{invoice.note}</AppText>}</Card>}
   {photosBusy&&!assets.some(a=>a.download_url)&&<AppText tone="muted">{t('accountTools.loading')}</AppText>}
   {photoError&&<Card><AppText testID="invoice-photo-error" accessibilityRole="alert" tone="error">{t('invoice.photosUnavailable')}</AppText><Button testID="invoice-photo-retry" label={t('invoice.retryPhotos')} variant="secondary" disabled={busy||photosBusy||state.busy||state.pending} onPress={()=>setAttempt(v=>v+1)}/></Card>}
   <Card><AppText variant="section">{t('invoice.timeline')}</AppText>{(['requested','accepted','confirmed','customerPaid','workerPaid'] as const).map((key,n)=>{const done=[true,!['requested','declined','withdrawn'].includes(job.state),locked,!!invoice?.customer_payment_reported_at,!!invoice?.worker_receipt_confirmed_at][n];return <View key={key} style={styles.timeline}><View style={[styles.dot,done&&styles.doneDot]}><AppText tone={done?'success':'muted'}>{done?'✓':'◷'}</AppText></View><AppText variant="caption" style={styles.grow}>{t(`invoice.${key}`)}</AppText></View>;})}<AppText variant="caption" tone="muted">{t('jobs.noAutoClose')}</AppText></Card>
   {customer&&<Card><AppText variant="section">{t('invoice.pointWallet')}</AppText><AppText variant="title">{available===null?'—':num(available)} point</AppText><AppText tone="muted">{t('invoice.availablePoints')}</AppText></Card>}
   {wallet&&<Card style={styles.wallet}><AppText tone="surface" variant="section">{t('invoice.wallet')}</AppText><AppText tone="surface">{t('invoice.balance')}</AppText><AppText tone="surface" variant="title">{money(wallet.balance)}</AppText><AppText tone="surface">{t('invoice.holds')}: {money(wallet.fee_holds)}</AppText><AppText tone="surface">{t('invoice.withdrawable')}: {money(wallet.withdrawable)}</AppText><AppText tone="surface" variant="caption">{t('invoice.walletHint')}</AppText></Card>}
   {(customer||wallet)&&<Card><Button testID="invoice-history" label={t('invoice.history')} variant="link" onPress={()=>setHistory(v=>!v)}/>{history&&<>{ledgerBusy&&<AppText tone="muted">{t('accountTools.loading')}</AppText>}{ledgerError&&<><AppText testID="invoice-history-error" accessibilityRole="alert" tone="error">{t('invoice.historyUnavailable')}</AppText><Button label={t('common.retry')} variant="secondary" disabled={ledgerBusy} onPress={()=>setLedgerAttempt(v=>v+1)}/></>}{ledger&&<>{!ledger.items.length&&<AppText tone="muted">{t('invoice.emptyHistory')}</AppText>}{ledger.items.map(e=><View key={e.id} style={styles.total}><View style={styles.amount}><AppText style={styles.grow}>{t(e.kind==='reward'?'invoice.rewardEntry':e.kind==='points_spent'?'invoice.pointsEntry':'invoice.settlementEntry')}</AppText><AppText tone={e.amount.startsWith('-')?'text':'success'}>{e.amount.startsWith('-')?'':'+'}{e.unit==='VND'?money(e.amount):num(e.amount)+' point'}</AppText></View><AppText variant="caption" tone="muted">{new Date(e.created_at).toLocaleString(locale,{timeZone:'Asia/Ho_Chi_Minh'})}</AppText><AppText variant="caption" tone="muted">{t('invoice.reference',{id:e.reference_id})}</AppText></View>)}{ledger.next_cursor&&<Button label={t('invoice.more')} variant="secondary" disabled={ledgerBusy||auth.busy} onPress={()=>{setLedgerBusy(true);setLedgerError(false);void manager.getLedger(owner,customer?undefined:job.partner_id,ledger.next_cursor??undefined).then(page=>{if(mounted.current)setLedger(old=>({items:[...(old?.items??[]),...page.items.filter(e=>!old?.items.some(x=>x.id===e.id))],next_cursor:page.next_cursor}));}).catch(()=>{if(mounted.current)setLedgerError(true);}).finally(()=>{if(mounted.current)setLedgerBusy(false);});}}/>}</>}</>}</Card>}
  </>}
  {invoice&&<Button testID="invoice-support" variant="link" label={t('support.title')} disabled={busy||auth.busy||state.pending||up.pending} onPress={()=>report(invoice)}/>}
  <Button testID="invoice-reload" label={t('accountTools.reload')} variant="link" disabled={busy||auth.busy||state.busy||state.pending||up.busy||up.pending} onPress={()=>{edited.current=false;formVersion.current=null;setStale(false);setAttempt(x=>x+1);}}/>
 </>;
}
const styles=StyleSheet.create({
 paymentMarks:{gap:12,padding:16,borderRadius:12,backgroundColor:'#f4f7fc'},panel:{gap:20},grow:{flex:1},invoiceTitle:{flexDirection:'row',alignItems:'center',gap:12},receipt:{fontSize:28},
 photos:{gap:12},photo:{width:'100%',height:180,borderRadius:12,backgroundColor:'#edf4f1'},photoInput:{padding:16,borderWidth:1,borderStyle:'dashed',borderColor:'#afbed2',borderRadius:12,backgroundColor:'#f8faff',gap:16},
 totalAmount:{fontSize:24,lineHeight:32},amount:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,paddingVertical:12},amountLabel:{flex:1,fontSize:14,lineHeight:22},amountValue:{fontWeight:'700',fontSize:14,lineHeight:22,flexShrink:1,textAlign:'right',fontVariant:['tabular-nums']},total:{borderTopWidth:1,borderTopColor:theme.colors.border},cash:{backgroundColor:theme.colors.text,borderRadius:18,padding:20,marginTop:12,flexDirection:'column',alignItems:'flex-start'},cashValue:{fontSize:24,lineHeight:32},
 points:{backgroundColor:'#f4f7fc',borderRadius:12,padding:16,gap:8},notice:{backgroundColor:'#f4f7fc',padding:16,borderRadius:10,fontSize:14,lineHeight:23},receive:{backgroundColor:'#f1f7f4',borderRadius:12,padding:16,gap:20},check:{flexDirection:'row',gap:12,alignItems:'flex-start',minHeight:44},
 timeline:{flexDirection:'row',alignItems:'center',gap:12,minHeight:40},dot:{backgroundColor:'#edf0f5',width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center'},doneDot:{backgroundColor:'#e6f3ee'},wallet:{backgroundColor:theme.colors.text},
});
