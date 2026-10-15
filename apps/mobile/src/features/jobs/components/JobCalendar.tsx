import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { theme } from '../../../theme/tokens';
import { formatBusinessDate } from '../../../lib/i18n/formatters';
import type { Job } from '../models';
import { businessDay, jobsByDay, monthCells, shiftMonth } from '../state/calendar';

export function JobCalendar({items, open, selected, setSelected, loading = false}: {items: Job[]; loading?: boolean; open: (id: string) => void; selected: string; setSelected: (day: string) => void}) {
  const {t, locale} = useLocale();
  const month = selected.slice(0, 7), groups = useMemo(() => jobsByDay(items), [items]);
  const undated = items.filter(j => !j.scheduled_at);
  const label = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Ho_Chi_Minh', ...options,
  }).format(new Date(`${day}T00:00:00+07:00`));
  const today = businessDay(new Date()), cells = monthCells(month);
  const card = (j: Job) => <Card key={j.id} testID={`calendar-job-${j.id}`}>
    {j.scheduled_at && <AppText variant="card" tone="primary">{formatBusinessDate(new Date(j.scheduled_at), locale)}</AppText>}
    <AppText>{t(`jobs.${j.state}`)}</AppText><AppText>{j.address.text}</AppText>
    {!!j.note && <AppText tone="muted">{j.note}</AppText>}
    <Button testID={`job-open-${j.id}`} label={t('jobs.detail')} variant="secondary" onPress={() => open(j.id)}/>
  </Card>;
  return <View style={styles.stack} testID="jobs-calendar">
    <AppText tone="muted">{t('calendar.hint')}</AppText>
    <Card>
      <View style={styles.heading}>
        <Pressable testID="calendar-previous" accessibilityRole="button" accessibilityLabel={t('calendar.previous')} onPress={() => setSelected(shiftMonth(month, -1) + '-01')} style={styles.arrow}><AppText tone="primary" variant="section">‹</AppText></Pressable>
        <AppText variant="card" style={styles.month} testID="calendar-month">{label(month + '-01', {month: 'long', year: 'numeric'})}</AppText>
        <Pressable testID="calendar-next" accessibilityRole="button" accessibilityLabel={t('calendar.next')} onPress={() => setSelected(shiftMonth(month, 1) + '-01')} style={styles.arrow}><AppText tone="primary" variant="section">›</AppText></Pressable>
      </View>
      <View style={styles.row}>
        {Array.from({length: 7}, (_, i) => <View key={i} style={styles.weekday}><AppText style={styles.small} tone="muted">{label(`2026-10-${19 + i}`, {weekday: 'short'})}</AppText></View>)}
      </View>
      {Array.from({length: cells.length / 7}, (_, week) => <View key={week} style={styles.row}>
        {cells.slice(week * 7, week * 7 + 7).map((day, i) => day ? <Pressable key={day} testID={`calendar-day-${day}`} accessibilityRole="button"
          accessibilityLabel={t('calendar.dayLabel', {date: label(day, {day: 'numeric', month: 'long', year: 'numeric'}), count: groups.get(day)?.length ?? 0})}
          accessibilityState={{selected: day === selected}} onPress={() => setSelected(day)}
          style={[styles.day, day === today && styles.today, day === selected && styles.selected]}>
          <AppText style={styles.dayText} tone={day === selected ? 'surface' : 'text'}>{Number(day.slice(8))}</AppText>
          <View style={[styles.dot, {backgroundColor: groups.has(day) ? (day === selected ? theme.colors.surface : theme.colors.primary) : 'transparent'}]}/>
        </Pressable> : <View key={`empty-${i}`} style={styles.day}/>) }
      </View>)}
      <Button testID="calendar-today" label={t('calendar.today')} variant="link" onPress={() => setSelected(businessDay(new Date()))}/>
    </Card>
    <AppText variant="section" testID="calendar-selected">{label(selected, {weekday: 'long', day: 'numeric', month: 'long'})}</AppText>
    <AppText tone="muted">{loading ? t('accountTools.loading') : t('calendar.count', {count: groups.get(selected)?.length ?? 0})}</AppText>
    {(groups.get(selected) ?? []).map(card)}
    {!!undated.length && <><AppText variant="section">{t('calendar.undated')}</AppText>{undated.map(card)}</>}
  </View>;
}
const styles = StyleSheet.create({
  stack: {gap: 12}, heading: {flexDirection: 'row', alignItems: 'center'},
  month: {flex: 1, textAlign: 'center'}, arrow: {minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center'},
  row: {flexDirection: 'row'}, weekday: {flex: 1, alignItems: 'center', paddingVertical: 10},
  small: {fontSize: 11}, day: {flex: 1, minHeight: 48, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', borderRadius: 10},
  dayText: {fontSize: 15, width: '100%', textAlign: 'center'}, today: {borderColor: theme.colors.primary}, selected: {backgroundColor: theme.colors.primary},
  dot: {width: 5, height: 5, borderRadius: 3, marginTop: 3},
});
