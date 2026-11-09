import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text, TextInput } from './LText';
import { loadPopularity, matchingRanges, recordSuggestion, searchSuggestions, type Scope, type Suggestion } from '../lib/suggest';
import { color, font, radius, shadow } from '../lib/theme';
import { Icon } from './Icon';

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
        placeholderTextColor={color.muted}
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
          <View style={s.head}>
            <Icon name="zap" size={15} color={color.tealText} />
            <Text style={s.title}>Önerilen filtreler</Text>
          </View>
          {items.map((it) => (
            <Pressable key={it.id} style={({ pressed }) => [s.row, pressed && { backgroundColor: color.tealSoft }]} accessibilityRole="button" onPress={() => { clearTimeout(blur.current); setOpen(false); if (onPick) { recordSuggestion(it.id); onPick(it); } else openSuggestion(it); }}>
              <View style={s.icon}><Icon name="search" size={15} color={color.tealText} /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Highlight label={it.label} query={value} style={s.label} />
                {it.parent ? <View style={s.path}><Text style={s.pathT} numberOfLines={1}>{it.parent}</Text></View> : null}
              </View>
              <Icon name="chevron-right" size={18} color={color.muted} />
            </Pressable>
          ))}
          {items.length === 0 ? <Text style={s.none}>Uygun filtre bulunamadı. Yazdığın kelimeyle aramak için Ara'ya dokun.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  input: { backgroundColor: color.surface, borderRadius: radius + 2, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, borderWidth: 1, borderColor: color.line },
  box: { backgroundColor: color.surface, borderRadius: radius + 4, marginTop: 8, borderWidth: 1, borderColor: color.line, overflow: 'hidden', ...shadow },
  boxDark: { borderColor: color.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  title: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: color.line },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  label: { color: color.ink, fontFamily: font.semi, fontSize: 15.5 },
  path: { alignSelf: 'flex-start', backgroundColor: color.tealSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '100%' },
  pathT: { color: color.tealText, fontFamily: font.semi, fontSize: 12 },
  mark: { color: color.tealText, fontFamily: font.bold },
  none: { padding: 14, color: color.muted, fontSize: 14, lineHeight: 20 },
});
