import {Pressable,ScrollView,StyleSheet} from 'react-native';
import {AppText} from './AppText';
import {theme} from '../../theme/tokens';
type Option<T extends string>={value:T;label:string;testID?:string;disabled?:boolean};
export function SegmentedTabs<T extends string>({value,onChange,options,accessibilityLabel,disabled=false,testID}:{value:T;onChange:(value:T)=>void;options:readonly Option<T>[];accessibilityLabel?:string;disabled?:boolean;testID?:string}){
 return <ScrollView testID={testID} horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={accessibilityLabel} contentContainerStyle={styles.options} style={styles.container} keyboardShouldPersistTaps="handled">
  {options.map(option=>{const selected=value===option.value,blocked=disabled||!!option.disabled;return <Pressable key={option.value} testID={option.testID} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{selected,disabled:blocked}} aria-selected={selected} disabled={blocked} onPress={()=>{if(!selected)onChange(option.value);}} style={({pressed})=>[styles.tab,selected&&styles.selected,blocked&&styles.disabled,pressed&&!blocked&&styles.pressed]}><AppText variant="caption" tone={selected?'primary':'muted'} style={selected?styles.activeLabel:undefined}>{option.label}</AppText></Pressable>;})}
 </ScrollView>;
}
const styles=StyleSheet.create({container:{flexGrow:0},options:{gap:8,paddingVertical:4},tab:{minHeight:44,borderWidth:1,borderColor:theme.colors.border,borderRadius:theme.radius.control,paddingHorizontal:14,paddingVertical:10,justifyContent:'center',backgroundColor:theme.colors.surface},selected:{backgroundColor:theme.colors.primarySoft,borderColor:'#A4B9ED'},activeLabel:{fontWeight:'600'},disabled:{opacity:0.55},pressed:{opacity:0.75}});
