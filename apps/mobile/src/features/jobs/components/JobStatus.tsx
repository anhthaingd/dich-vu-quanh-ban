import {StyleSheet, View} from 'react-native';
import {useLocale} from '../../../app/providers/LocaleProvider';
import {AppText} from '../../../components/ui/AppText';
import type {JobState} from '../models';

const appearance: Record<JobState, {icon: string; color: string; backgroundColor: string}> = {
  requested: {icon: '◷', color: '#925700', backgroundColor: '#FFF4DC'},
  accepted: {icon: '✓', color: '#2457D6', backgroundColor: '#EAF0FF'},
  awaiting_settlement: {icon: '◷', color: '#925700', backgroundColor: '#FFF4DC'},
  completed: {icon: '✓', color: '#24634D', backgroundColor: '#E6F3EE'},
  declined: {icon: '×', color: '#B42318', backgroundColor: '#FDECE9'},
  withdrawn: {icon: '−', color: '#526079', backgroundColor: '#EDF0F5'},
  stopped: {icon: '■', color: '#B42318', backgroundColor: '#FDECE9'},
};
export function JobStatus({state, testID}: {state: JobState; testID?: string}) {
  const {t} = useLocale(), visual = appearance[state];
  return <View style={[styles.badge, {backgroundColor: visual.backgroundColor}]}>
    <AppText accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" variant="caption" style={{color:visual.color}}>{visual.icon}</AppText>
    <AppText testID={testID} variant="caption" accessibilityLabel={t(`jobs.${state}`)} style={{color: visual.color}}>{t(`jobs.${state}`)}</AppText>
  </View>;
}
const styles = StyleSheet.create({badge: {flexDirection:'row',gap:6,alignItems:'center',alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6}});
