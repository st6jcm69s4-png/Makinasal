import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text as PlainText, View } from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from './LText';
import { loadPopularity, matchingRanges, recordSuggestion, searchSuggestions, type Scope, type Suggestion } from '../lib/suggest';

function Highlight({ label, query, style }: { label: string; query: string; style?: object }) {
  const parts: { t: string; hit: boolean }[] = [];
  let from = 0;
  for (const r of matchingRanges(label, query)) {
    if (r.start > from) parts.push({ t: label.slice(from, r.start), hit: false });
    parts.push({ t: label.slice(r.start, r.end), hit: true });
    from = r.end;
  }
  if (from < label.length) parts.push({ t: label.slice(from), hit: false });
  return <PlainText style={style}>{parts.map((p, i) => <PlainText key={i} style={p.hit ? s.mark : undefined}>{p.t}</PlainText>)}</PlainText>;
}

/** Öneriye dokununca ilgili ekranı açar. */
export function openSuggestion(item: Suggestion) {
  recordSuggestion(item.id);
  const [kind, ...rest] = item.id.split(':');
  const key = rest.join(':');
  if (kind === 'section') {
    const map: Record<string, () => void> = {
      machines: () => router.navigate({ pathname: '/ilanlar', params: { cat: 'group:machines', brand: '', n: String(Date.now()) } }),
      rentals: () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_machine' } }),
      personnel: () => router.navigate({ pathname: '/is-agi', params: { kind: 'rental_operator' } }),
      jobs: () => router.navigate({ pathname: '/is-agi', params: { kind: 'job' } }),
      parts: () => router.push('/yedek-parca'),
      requests: () => router.navigate({ pathname: '/is-agi', params: { kind: 'part_request' } }),
      companies: () => router.navigate({ pathname: '/is-agi', params: { kind: 'firma' } }),
    };
    map[key]?.();
  } else if (kind === 'group') router.navigate({ pathname: '/ilanlar', params: { cat: 'group:' + key, brand: '', n: String(Date.now()) } });
  else if (kind === 'category') router.navigate({ pathname: '/ilanlar', params: { cat: key, brand: '', n: String(Date.now()) } });
  else if (kind === 'part') router.push({ pathname: '/yedek-parca', params: { part: key, n: String(Date.now()) } });
  else if (kind === 'brand') router.navigate({ pathname: '/ilanlar', params: { brand: key, cat: '', n: String(Date.now()) } });
}

export function SearchBox({ value, onChangeText, onSubmit, scope = 'all', placeholder, onPick, inputStyle, dark }: {
  value: string; onChangeText: (v: string) => void; onSubmit?: () => void; scope?: Scope; placeholder?: string;
  /** Verilmezse öneri seçilince ilgili ekran açılır. */
  onPick?: (s: Suggestion) => void; inputStyle?: object; dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState<Record<string, number>>({});
  const blur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { let on = true; void loadPopularity().then((p) => { if (on) setPop(p); }); return () => { on = false; clearTimeout(blur.current); }; }, []);
  const items = useMemo(() => searchSuggestions(value, pop, scope), [value, pop, scope]);
  const show = open && value.trim().length > 0;
  return (
    <View>
      <TextInput
        style={[s.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={value}
        onChangeText={(v) => { onChangeText(v); setOpen(true); }}
        onFocus={() => { clearTimeout(blur.current); setOpen(true); }}
        onBlur={() => { blur.current = setTimeout(() => setOpen(false), 150); }}
        onSubmitEditing={() => { setOpen(false); onSubmit?.(); }}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={200}
      />
      {show ? (
        <View style={[s.box, dark && s.boxDark]}>
          <Text style={s.title}>Önerilen filtreler</Text>
          {items.map((it) => (
            <Pressable key={it.id} style={s.row} accessibilityRole="button" onPress={() => { clearTimeout(blur.current); setOpen(false); if (onPick) { recordSuggestion(it.id); onPick(it); } else openSuggestion(it); }}>
              <Highlight label={it.label} query={value} style={s.label} />
              <Text style={s.path}>{it.parent} →</Text>
            </Pressable>
          ))}
          {items.length === 0 ? <Text style={s.none}>Uygun filtre bulunamadı. Yazdığın kelimeyle aramak için Ara'ya dokun.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#DDD9DC' },
  box: { backgroundColor: '#fff', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#DDD9DC', overflow: 'hidden' },
  boxDark: { borderColor: '#fff' },
  title: { fontSize: 12, fontWeight: '700', color: '#66616A', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#F0EBEB' },
  label: { flex: 1, color: '#25272D', fontSize: 15 },
  path: { color: '#66616A', fontSize: 12, maxWidth: '45%' },
  mark: { backgroundColor: '#FFE066', color: '#25272D', fontWeight: '700' },
  none: { padding: 12, color: '#66616A' },
});
