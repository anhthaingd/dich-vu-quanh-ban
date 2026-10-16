import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {useCallback,useRef,useState,useSyncExternalStore} from 'react';
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
import {sessionReady} from '../../jobs/state/session-ready';
import {Mutation} from '../../jobs/state/mutation';
import {JobFeedback} from '../../jobs/components/JobFeedback';
import type {Job} from '../../jobs/models';
import {formatInteger} from '../format-amount';
import type {Asset,LedgerPage,Invoice,InvoiceAction,InvoiceChange,Wallet} from '../models';
export function InvoiceScreen({navigation,route}:NativeStackScreenProps<RootStackParamList,'Invoice'>){return <AccountPage title="invoice.title" back={()=>navigation.goBack()} login={()=>navigation.navigate('Account')}>{owner=><InvoiceContent key={owner+route.params.id} owner={owner} id={route.params.id} report={invoice=>navigation.navigate('Support',{context:{kind:'invoice',job_id:route.params.id,invoice_id:invoice.id,invoice_version_id:invoice.version_id}})}/>}</AccountPage>;}
const validAmount=(v:string)=>/^(0|[1-9][0-9]*)$/.test(v);
function InvoiceContent({owner,id,report}:{owner:string;id:string;report:(invoice:Invoice)=>void}){
 const {manager,state:auth}=useAuth(),{t,locale}=useLocale();
 const [job,setJob]=useState<Job|null>(null),[invoice,setInvoice]=useState<Invoice|null>(null),[assets,setAssets]=useState<Asset[]>([]),[available,setAvailable]=useState('0'),[wallet,setWallet]=useState<Wallet|null>(null);
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
   await sessionReady(manager,owner);const j=await manager.getJob(owner,id);let i:Invoice|null=null;
   try{i=await manager.getInvoice(owner,id);}catch(e){if(!(e instanceof ApiError)||e.code!=='NOT_FOUND')throw e;}
   const photos:Asset[]=[];if(i)for(const aid of i.result_asset_ids){if(!active)return;photos.push(await manager.getAsset(owner,aid));}
   let pointsAvailable='0',w:Wallet|null=null;
   if(j.customer_id===owner)pointsAvailable=(await manager.getPoints(owner)).available;
   else try{w=await manager.getWallet(owner,j.partner_id);}catch(e){if(!(e instanceof ApiError)||!['NOT_FOUND','FORBIDDEN'].includes(e.code))throw e;}
   const entries=j.customer_id===owner||w?await manager.getLedger(owner,j.customer_id===owner?undefined:j.partner_id):null;
   if(!active)return;
   // Realtime is only an invalidation. A delayed/duplicate event must not lock
   // an edited form when HTTP still returns the version already displayed.
   const previous=currentInvoice.current;
   if(edited.current&&(previous?.version!==i?.version||previous?.version_id!==i?.version_id)){setStale(true);return;}
   setLedger(entries);setJob(j);setInvoice(i);setAvailable(pointsAvailable);setWallet(w);
   // Reloading never silently replaces an edited draft or a customer's point choice.
   if(formVersion.current!==i?.version_id){setLabor(i?.labor??'');setMaterials(i?.materials??'');setNote(i?.note??'');setPoints(i?.points_used??'0');setAssets(photos);formVersion.current=i?.version_id??null;}
   else setAssets(old=>old.map(a=>photos.find(p=>p.id===a.id)??a));
  })().catch(e=>{if(active){setError(e instanceof ApiError?e.code:'NETWORK');if(e instanceof ApiError&&['FORBIDDEN','NOT_FOUND','UNAUTHENTICATED'].includes(e.code)){setJob(null);setInvoice(null);setAssets([]);}}}).finally(()=>{if(active)setBusy(false);});
  return ()=>{active=false;mounted.current=false;};
 },[manager,owner,id,attempt]));
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
  if(action==='confirm'&&(!validAmount(points)||BigInt(points)>BigInt(invoice.total)||BigInt(points)>BigInt(available))){setError('VALIDATION');return;}
  if(action==='revision-requests'&&!reason.trim()){setError('VALIDATION');return;}
  const input:InvoiceChange={expected_version:invoice.version,...(action==='send'?{draft_version_id:invoice.version_id}:action==='revision-requests'?{reason:reason.trim()}:{version_id:invoice.version_id}),...(action==='confirm'?{points_used:points}:{}),...(action==='payment-reported'?{confirmed:true as const}:{}),...(action==='settle'?{received_in_full:true as const}:{})};
  apply(await mutation.run(key=>afterRead(()=>manager.changeInvoice(owner,invoice.id,action,input,key))));
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
  edited.current=true;
  setError(null);
  try{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(r.canceled||!r.assets[0]||!mounted.current)return;
   const photo=r.assets[0];const blob=photo.file??await(await fetch(photo.uri)).blob();
   if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||blob.size>10*1024*1024||!blob.size){setError('VALIDATION');return;}
   const a=await upload.run(key=>manager.uploadResult(owner,blob,key));if(a&&mounted.current)setAssets(old=>[...old.filter(x=>x.id!==a.id),a]);
  }catch(e){if(mounted.current)setError(e instanceof ApiError?e.code:'NETWORK');}
 };
 const feedback=error??state.error??up.error;
 const special=feedback==='PARTNER_FUNDING_REQUIRED'?'invoice.funding':feedback==='INSUFFICIENT_POINTS'?'invoice.insufficient':feedback==='VALIDATION'?'invoice.invalid':null;
 const row=(label:string,value:string,kind?:'total'|'cash')=><View style={[styles.amount,kind==='total'&&styles.total,kind==='cash'&&styles.cash]}><AppText style={styles.amountLabel} tone={kind==='cash'?'primary':'text'}>{label}</AppText><AppText style={[styles.amountValue,kind==='cash'&&styles.cashValue]} tone={kind==='cash'?'primary':'text'}>{value}</AppText></View>;
 const photos=<View style={styles.photos}>{assets.map(a=><Image key={a.id} testID="invoice-photo" source={{uri:a.download_url??undefined}} accessibilityLabel={t('invoice.photoAlt')} style={styles.photo} resizeMode="contain"/>)}</View>;
 return <>
  {invoice&&<Button testID="invoice-support" label={t('support.title')} disabled={busy||auth.busy||state.pending||up.pending} onPress={()=>report(invoice)}/>}
  <AppText variant="caption" tone="muted">{t('invoice.test')}</AppText>
  <Button testID="invoice-reload" label={t('accountTools.reload')} variant="link" disabled={busy||auth.busy||state.busy||state.pending||up.busy||up.pending} onPress={()=>{edited.current=false;formVersion.current=null;setStale(false);setAttempt(x=>x+1);}}/>
  {stale&&<AppText accessibilityRole="alert">{t('jobs.reloadBeforeRetry')}</AppText>}
  {busy&&<AppText>{t('accountTools.loading')}</AppText>}
  {special?<AppText accessibilityRole="alert" tone="error">{t(special)}</AppText>:<JobFeedback error={feedback} pending={state.pending||up.pending} busy={state.busy||up.busy||auth.busy} retry={state.pending?()=>void mutation.run().then(apply):up.pending?()=>void upload.run().then(a=>{if(a&&mounted.current)setAssets(old=>[...old.filter(x=>x.id!==a.id),a]);}):undefined}/>}
  {job&&<>
   <Card><AppText variant="section">{t('invoice.timeline')}</AppText>{(['requested','accepted','confirmed','customerPaid','workerPaid'] as const).map((key,n)=>{const done=[true,!['requested','declined','withdrawn'].includes(job.state),locked,!!invoice?.customer_payment_reported_at,!!invoice?.worker_receipt_confirmed_at][n];return <View key={key} style={styles.timeline}><View style={[styles.dot,done&&styles.doneDot]}><AppText tone={done?'success':'muted'}>{done?'✓':'◷'}</AppText></View><AppText variant="caption" style={styles.grow}>{t(`invoice.${key}`)}</AppText></View>;})}<AppText variant="caption" tone="muted">{t('jobs.noAutoClose')}</AppText></Card>
   {job.state==='stopped'&&<AppText tone="muted">{t('jobs.stopped')}</AppText>}
   {editing?<Card testID="invoice-editor" style={styles.panel}>
    <AppText variant="section">{t(invoice?.revision_reason?'invoice.edit':'invoice.editor')}</AppText>{invoice?.revision_reason&&<AppText style={styles.notice}>{t('invoice.revision',{reason:invoice.revision_reason})}</AppText>}
    <View style={styles.photoInput}><AppText variant="card">{t('invoice.photos')}</AppText>{photos}<Button testID="invoice-pick" label={t('invoice.pick')} variant="secondary" disabled={blocked} onPress={()=>void picked()}/></View>
    <AppText variant="card">{t('invoice.costs')}</AppText>
    <Input testID="invoice-materials" label={t('invoice.materialInput')} value={materials} onChangeText={v=>{edited.current=true;setMaterials(v);}} keyboardType="number-pad" editable={!draftBlocked}/>
    <Input testID="invoice-labor" label={t('invoice.laborInput')} value={labor} onChangeText={v=>{edited.current=true;setLabor(v);}} keyboardType="number-pad" editable={!draftBlocked}/>
    <Input testID="invoice-note" label={t('invoice.note')} value={note} onChangeText={v=>{edited.current=true;setNote(v);}} multiline editable={!draftBlocked}/>
    <AppText variant="caption" tone="muted">{t('invoice.direct')}</AppText>{saved&&<AppText tone="success">{t('invoice.saved')}</AppText>}
    <Button testID="invoice-send" label={t('invoice.send')} disabled={draftBlocked||!assets.length} onPress={()=>void save(true)}/><Button testID="invoice-save" label={t('invoice.save')} variant="secondary" disabled={draftBlocked} onPress={()=>void save(false)}/>
   </Card>:invoice?<Card testID="invoice-review" style={styles.panel}>
    <View style={styles.invoiceTitle}><AppText tone="primary" style={styles.receipt}>▤</AppText><View style={styles.grow}><AppText variant="brand" tone="muted">{t('invoice.version',{version:invoice.version})}</AppText><AppText variant="section">{t(locked?'invoice.locked':'invoice.review')}</AppText></View></View>
    {photos}{!!invoice.note&&<AppText style={styles.notice}>{invoice.note}</AppText>}
    <View>{row(t('invoice.materials'),money(invoice.materials))}{row(t('invoice.labor'),money(invoice.labor))}{row(t('invoice.total'),money(invoice.total),'total')}</View>
    {invoice.state==='revision_requested'?<AppText style={styles.notice}>{t('invoice.revision',{reason:invoice.revision_reason??''})}</AppText>:<>
     {customer&&job.state==='accepted'&&!locked&&invoice.state==='sent'&&<View style={styles.points}><Input testID="invoice-points" label={t('invoice.points')} value={points} onChangeText={v=>{edited.current=true;setPoints(v);}} keyboardType="number-pad" editable={!draftBlocked}/><AppText variant="caption" tone="muted">{t('invoice.available',{amount:num(available)})}</AppText><Button testID="invoice-max" variant="link" label={t('invoice.max')} disabled={draftBlocked} onPress={()=>{edited.current=true;setPoints(String(BigInt(available)<BigInt(invoice.total)?BigInt(available):BigInt(invoice.total)));}}/></View>}
     {locked&&<AppText style={styles.notice}>{t('invoice.lockedHint')}</AppText>}
     <View>{row(t('invoice.deduction'),'−'+money(used))}{row(t(customer?'invoice.cash':'invoice.cashWorker'),money(cash),'cash')}</View>
     <AppText variant="caption" tone="muted">{t(cash==='0'?'invoice.zero':customer?'invoice.payHint':'invoice.payHintWorker')}</AppText>
     {customer&&<View><AppText tone="success">{t(invoice.settled?'invoice.rewarded':'invoice.reward',{amount:num(reward)})}</AppText><AppText variant="caption" tone="muted">{t('invoice.rewardHint')}</AppText></View>}
     {customer&&job.state==='accepted'&&!locked&&invoice.state==='sent'&&<><Button testID="invoice-confirm" label={t('invoice.confirm')} disabled={draftBlocked} onPress={()=>void act('confirm')}/><Button testID="invoice-revise" variant="link" label={t('invoice.revise')} disabled={draftBlocked} onPress={()=>setRevision(v=>!v)}/>{revision&&<><Input testID="invoice-reason" label={t('invoice.reason')} value={reason} onChangeText={v=>{edited.current=true;setReason(v);}} multiline editable={!draftBlocked}/><Button testID="invoice-revision-send" variant="secondary" label={t('invoice.revisionSend')} disabled={draftBlocked||!reason.trim()} onPress={()=>void act('revision-requests')}/></> }</>}
     {locked&&customer&&!invoice.customer_payment_reported_at&&<Button testID="invoice-paid" label={t(cash==='0'?'invoice.paidZero':'invoice.paid')} disabled={draftBlocked} onPress={()=>void act('payment-reported')}/>}
     {invoice.state==='locked'&&!customer&&worker&&<View style={styles.receive}>
      <Pressable testID="invoice-receive-check" accessibilityRole="checkbox" accessibilityState={{checked:received,disabled:draftBlocked}} disabled={draftBlocked} onPress={()=>setReceived(v=>!v)} style={styles.check}><AppText tone="primary">{received?'☑':'☐'}</AppText><AppText style={styles.grow}>{t(cash==='0'?'invoice.receiveZero':'invoice.receiveCheck')}</AppText></Pressable>
      <Button testID="invoice-receive" label={t(cash==='0'?'invoice.complete':'invoice.receive')} disabled={draftBlocked||!received} onPress={()=>void act('settle')}/>
     </View>}
     {invoice.review_eligible?<AppText testID="invoice-done" style={styles.notice}>{t('invoice.done')}</AppText>:invoice.worker_receipt_confirmed_at?<AppText style={styles.notice}>{t('invoice.waitingCustomer')}</AppText>:invoice.customer_payment_reported_at?<AppText style={styles.notice}>{t('invoice.waitingWorker')}</AppText>:!customer&&invoice.state==='sent'?<AppText style={styles.notice}>{t('invoice.waitingReview')}</AppText>:null}
    </>}
   </Card>:<Card><AppText variant="section">{t('invoice.wait')}</AppText><AppText tone="muted">{t(customer?'invoice.waitHint':'invoice.assignedOnly')}</AppText></Card>}
   {customer&&<Card><AppText variant="section">{t('invoice.pointWallet')}</AppText><AppText variant="title">{num(available)} point</AppText><AppText tone="muted">{t('invoice.availablePoints')}</AppText></Card>}
   {wallet&&<Card style={styles.wallet}><AppText tone="surface" variant="section">{t('invoice.wallet')}</AppText><AppText tone="surface">{t('invoice.balance')}</AppText><AppText tone="surface" variant="title">{money(wallet.balance)}</AppText><AppText tone="surface">{t('invoice.holds')}: {money(wallet.fee_holds)}</AppText><AppText tone="surface">{t('invoice.withdrawable')}: {money(wallet.withdrawable)}</AppText><AppText tone="surface" variant="caption">{t('invoice.walletHint')}</AppText></Card>}
   {ledger&&<Card><Button testID="invoice-history" label={t('invoice.history')} variant="link" onPress={()=>setHistory(v=>!v)}/>{history&&<>{!ledger.items.length&&<AppText tone="muted">{t('invoice.emptyHistory')}</AppText>}{ledger.items.map(e=><View key={e.id} style={styles.total}><View style={styles.amount}><AppText style={styles.grow}>{t(e.kind==='reward'?'invoice.rewardEntry':e.kind==='points_spent'?'invoice.pointsEntry':'invoice.settlementEntry')}</AppText><AppText tone={e.amount.startsWith('-')?'text':'success'}>{e.amount.startsWith('-')?'':'+'}{e.unit==='VND'?money(e.amount):num(e.amount)+' point'}</AppText></View><AppText variant="caption" tone="muted">{new Date(e.created_at).toLocaleString(locale,{timeZone:'Asia/Ho_Chi_Minh'})}</AppText><AppText variant="caption" tone="muted">{t('invoice.reference',{id:e.reference_id})}</AppText></View>)}{ledger.next_cursor&&<Button label={t('invoice.more')} variant="secondary" disabled={blocked} onPress={()=>{setBusy(true);void manager.getLedger(owner,customer?undefined:job.partner_id,ledger.next_cursor??undefined).then(page=>{if(mounted.current)setLedger(old=>({items:[...(old?.items??[]),...page.items.filter(e=>!old?.items.some(x=>x.id===e.id))],next_cursor:page.next_cursor}));}).catch(e=>{if(mounted.current)setError(e instanceof ApiError?e.code:'NETWORK');}).finally(()=>{if(mounted.current)setBusy(false);});}}/>}</>}</Card>}
  </>}
 </>;
}
const styles=StyleSheet.create({
 panel:{gap:24},grow:{flex:1},invoiceTitle:{flexDirection:'row',alignItems:'center',gap:12},receipt:{fontSize:28},
 photos:{gap:12},photo:{width:'100%',height:180,borderRadius:12,backgroundColor:'#edf4f1'},photoInput:{padding:16,borderWidth:1,borderStyle:'dashed',borderColor:'#afbed2',borderRadius:12,backgroundColor:'#f8faff',gap:16},
 amount:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,paddingVertical:12},amountLabel:{flex:1,fontSize:14,lineHeight:22},amountValue:{fontWeight:'700',fontSize:14,lineHeight:22,flexShrink:1,textAlign:'right',fontVariant:['tabular-nums']},total:{borderTopWidth:1,borderTopColor:theme.colors.border},cash:{borderTopWidth:1,borderTopColor:theme.colors.border},cashValue:{fontSize:24,lineHeight:32},
 points:{backgroundColor:'#f4f7fc',borderRadius:12,padding:16,gap:8},notice:{backgroundColor:'#f4f7fc',padding:16,borderRadius:10,fontSize:14,lineHeight:23},receive:{backgroundColor:'#f1f7f4',borderRadius:12,padding:16,gap:20},check:{flexDirection:'row',gap:12,alignItems:'flex-start',minHeight:44},
 timeline:{flexDirection:'row',alignItems:'center',gap:12,minHeight:40},dot:{backgroundColor:'#edf0f5',width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center'},doneDot:{backgroundColor:'#e6f3ee'},wallet:{backgroundColor:theme.colors.text},
});
