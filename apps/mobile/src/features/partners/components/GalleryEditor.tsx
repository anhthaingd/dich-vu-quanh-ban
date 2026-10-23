import type {Gallery} from '../api/gallery-api';
import {useCallback,useRef,useState,useSyncExternalStore} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {useAuth} from '../../../app/providers/AuthProvider';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {EvidencePhoto} from '../../support/screens/EvidencePhoto';
import {JobFeedback} from '../../jobs/components/JobFeedback';
import {Mutation} from '../../jobs/state/mutation';
import {sessionOperation} from '../../jobs/state/session-ready';
import {ApiError,type ApiErrorCode} from '../../../lib/http/api-error';
import type {Partner} from '../models';
import type {VerificationAsset} from '../../verification/api/verification-api';
export function GalleryEditor({owner,partner,blocked,saved}:{owner:string;partner:Pick<Partner,'id'>;blocked:boolean;saved:()=>void}){
 const {manager}=useAuth(),{t}=useLocale(),[ids,setIds]=useState<string[]>([]),[version,setVersion]=useState(0),[attempt,setAttempt]=useState(0),[picking,setPicking]=useState(false),[error,setError]=useState<ApiErrorCode|null>(null);
 const [upload]=useState(()=>new Mutation<VerificationAsset>()),state=useSyncExternalStore(upload.subscribe,upload.getSnapshot,upload.getSnapshot),live=useRef(false);
 useFocusEffect(useCallback(()=>{live.current=true;return()=>{live.current=false;};},[]));
 useFocusEffect(useCallback(()=>{let active=true;setError(null);void manager.gallery(owner,partner.id).then(r=>{if(active){setIds(r.asset_ids);setVersion(r.version);}}).catch(e=>{if(active){setIds([]);setVersion(0);setError(e instanceof ApiError?e.code:'NETWORK');}});return()=>{active=false;};},[manager,owner,partner.id,attempt]));
 const complete=(r:Gallery|null)=>{if(r&&live.current){setIds(r.asset_ids);setVersion(r.version);saved();}};
 const [mutation]=useState(()=>new Mutation<Gallery>()),m=useSyncExternalStore(mutation.subscribe,mutation.getSnapshot,mutation.getSnapshot);
 const disabled=blocked||picking||state.busy||state.pending||m.busy||m.pending||!version;
 const photo=useCallback((id:string)=>manager.galleryAsset(owner,id),[manager,owner]);
 const added=(a:VerificationAsset|null)=>{if(a&&live.current)setIds(v=>v.includes(a.id)?v:[...v,a.id]);};
 const pick=async()=>{setPicking(true);setError(null);try{const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});if(r.canceled||!r.assets[0]||!live.current)return;const chosen=r.assets[0],raw=chosen.file??await(await fetch(chosen.uri)).blob(),blob=raw.type?raw:raw.slice(0,raw.size,chosen.mimeType??'');if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||!blob.size||blob.size>10*1024*1024)throw new ApiError('VALIDATION');added(await upload.run(k=>sessionOperation(manager,owner,()=>manager.uploadGallery(owner,blob,k),()=>live.current)));}catch(e){if(live.current)setError(e instanceof ApiError?e.code:'NETWORK');}finally{if(live.current)setPicking(false);}};
 return <Card><AppText variant="section">{t('partners.gallery')}</AppText><AppText>{t('partners.galleryHint')}</AppText>{!ids.length&&<AppText>{t('partners.galleryEmpty')}</AppText>}{ids.map((id,i)=><Card key={id}><AppText>{i+1} / {ids.length}</AppText><EvidencePhoto id={id} load={photo}/><Button testID={'gallery-up-'+i} label={t('partners.moveUp')} variant="secondary" disabled={disabled||i===0} onPress={()=>setIds(v=>{const next=[...v];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}/><Button testID={'gallery-remove-'+i} label={t('partners.remove')} variant="link" disabled={disabled} onPress={()=>setIds(v=>v.filter(x=>x!==id))}/></Card>)}<Button testID="gallery-pick" label={t('partners.addPhoto')} disabled={disabled||ids.length>=12} onPress={()=>void pick()}/><Button testID="gallery-save" label={t('partners.save')} disabled={disabled} onPress={()=>{const input=[...ids],v=version;void mutation.run(k=>sessionOperation(manager,owner,()=>manager.saveGallery(owner,partner.id,v,input,k),()=>live.current)).then(complete);}}/><Button label={t('partners.reload')} disabled={blocked||picking||state.pending||state.busy||m.pending||m.busy} variant="secondary" onPress={()=>setAttempt(n=>n+1)}/><JobFeedback error={m.error} pending={m.pending} busy={m.busy||blocked} retry={m.pending?()=>void mutation.run().then(complete):undefined}/><JobFeedback error={error??state.error} pending={state.pending} busy={state.busy||blocked} retry={state.pending?()=>void upload.run().then(added):undefined}/></Card>;
}
