import {useState} from 'react';
import {Modal,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Card} from '../../../components/ui/Card';
import {AppText} from '../../../components/ui/AppText';
import {Button} from '../../../components/ui/Button';
import type {Translate} from './presentation';
export function AdminChoice({id,label,value,choices,onChange,disabled,t}:{id:string;label:string;value:string;choices:string[];onChange:(v:string)=>void;disabled?:boolean;t:Translate}){
 const [open,setOpen]=useState(false);
 return <View style={{gap:8}}><AppText>{label}</AppText><Button testID={id} label={t(value)+' ▾'} variant="secondary" disabled={disabled} onPress={()=>setOpen(true)}/>
 <Modal visible={open&&!disabled} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><SafeAreaView style={{flex:1,backgroundColor:'#0008',justifyContent:'center',padding:24}}><Card><AppText variant="card">{label}</AppText><ScrollView contentContainerStyle={{gap:8}}>{choices.map(c=><Button key={c} testID={id+'-'+c} label={t(c)} variant={value===c?'primary':'secondary'} accessibilityState={{selected:value===c}} onPress={()=>{onChange(c);setOpen(false);}}/>)}</ScrollView><Button label={t('back')} variant="link" onPress={()=>setOpen(false)}/></Card></SafeAreaView></Modal>
 </View>;
}
