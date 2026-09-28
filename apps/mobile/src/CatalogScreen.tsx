import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CatalogApi, Category, Skill } from './api';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; categories: Category[]; skills: Skill[] };
export function CatalogScreen({ api }: { api: CatalogApi }) {
  const [trail, setTrail] = useState<Category[]>([]);
  const selected = trail.at(-1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    Promise.all([api.categories(selected?.id, controller.signal), selected ? api.skills(selected.id, controller.signal) : Promise.resolve([])])
      .then(([categories, skills]) => { if (!controller.signal.aborted) setState({ kind: 'ready', categories, skills }); })
      .catch(() => { if (!controller.signal.aborted) setState({ kind: 'error' }); });
    return () => controller.abort();
  }, [api, selected?.id, retry]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selected) return false;
      setTrail(current => current.slice(0, -1));
      return true;
    });
    return () => sub.remove();
  }, [selected]);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Text style={styles.brand}>DỊCH VỤ QUANH BẠN</Text>
    {selected && <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.back} onPress={() => setTrail(current => current.slice(0, -1))}><Text style={styles.link}>← Quay lại</Text></Pressable>}
    <Text accessibilityRole="header" style={styles.title}>{selected?.name_vi ?? 'Bạn cần dịch vụ gì?'}</Text>
    <Text style={styles.subtitle}>{selected ? 'Khám phá nhóm dịch vụ và kỹ năng phù hợp.' : 'Khám phá các ngành dịch vụ tại Hà Nội.'}</Text>
    {state.kind === 'loading' && <View style={styles.status} accessibilityLiveRegion="polite"><ActivityIndicator color="#2457D6" /><Text style={styles.body}>Đang tải danh mục…</Text></View>}
    {state.kind === 'error' && <View style={styles.status} accessibilityLiveRegion="polite"><Text accessibilityRole="alert" style={styles.error}>Không tải được danh mục. Kiểm tra kết nối và thử lại.</Text><Pressable accessibilityRole="button" style={styles.primary} onPress={() => setRetry(n => n + 1)}><Text style={styles.primaryText}>Thử lại</Text></Pressable></View>}
    {state.kind === 'ready' && <>
      {state.categories.length === 0 && state.skills.length === 0 && <View style={styles.status}><Text style={styles.body}>Chưa có dịch vụ đang hoạt động.</Text></View>}
      {state.categories.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={category.name_vi} style={styles.card} onPress={() => setTrail(current => [...current, category])}><Text style={styles.cardTitle}>{category.name_vi}</Text><Text style={styles.link}>Xem dịch vụ →</Text></Pressable>)}
      {state.skills.length > 0 && <Text accessibilityRole="header" style={styles.section}>Kỹ năng</Text>}
      {state.skills.map(skill => <View key={skill.id} style={styles.skill}><View style={styles.dot} /><Text style={styles.skillText}>{skill.name_vi}</Text></View>)}
    </>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4F7FC' },
  content: { padding: 24, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  brand: { color: '#2457D6', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginVertical: 16 },
  title: { color: '#16233B', fontSize: 30, fontWeight: '700', marginBottom: 12 },
  subtitle: { color: '#52617A', fontSize: 16, lineHeight: 24, marginBottom: 28 },
  body: { color: '#16233B', fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#DEE5F0', padding: 20, marginBottom: 12, minHeight: 90, gap: 12 },
  cardTitle: { color: '#16233B', fontSize: 18, fontWeight: '600' },
  link: { color: '#2457D6', fontSize: 14, fontWeight: '600' },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 12 },
  status: { backgroundColor: 'white', padding: 24, borderRadius: 16, gap: 20 },
  error: { color: '#B42318', fontSize: 16, lineHeight: 24 },
  primary: { backgroundColor: '#2457D6', minHeight: 48, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 16, fontWeight: '600' },
  section: { fontSize: 22, fontWeight: '700', color: '#16233B', marginTop: 20, marginBottom: 12 },
  skill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 12, borderBottomWidth: 1, borderColor: '#DEE5F0' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2457D6' },
  skillText: { fontSize: 16, color: '#16233B', flex: 1, lineHeight: 24 },
});
