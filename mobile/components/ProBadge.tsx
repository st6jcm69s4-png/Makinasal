import { useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlainText } from './LText';
import { Icon } from './Icon';
import { activePlan, type PlanId } from '../lib/plans';
import { supabase } from '../lib/supabase';
import { tr } from '../lib/i18n';
import { color, font } from '../lib/theme';

/**
 * Premium üyelik rozeti ve üyelerin tarifesini topluca getiren küçük önbellek.
 * Rozet yalnızca "bu üye Pro / Firma Pro" der; güven ya da doğrulama anlamı taşımaz.
 * Ekrandaki kartlar tek tek sorgu atmasın diye istekler 40 ms toplanıp tek sorguda gönderilir.
 */
const cache = new Map<string, PlanId | null>();
const listeners = new Set<() => void>();
let queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = [...queue].slice(0, 200);
  queue = new Set([...queue].slice(200));
  if (!ids.length) return;
  const { data, error } = await supabase.from('profiles').select('id,is_premium,premium_plan,premium_until').in('id', ids);
  if (!error) {
    const got = new Map((data ?? []).map((p) => [p.id as string, activePlan(p)]));
    for (const id of ids) cache.set(id, got.get(id) ?? null);
    listeners.forEach((f) => f());
  }
  if (queue.size) timer = setTimeout(() => void flush(), 40);
}
/** Tarifeleri önbelleğe ister (sonuç gelince rozetler kendiliğinden görünür). */
export function requestPlans(ids: (string | null | undefined)[]) {
  for (const id of ids) if (id && !cache.has(id)) queue.add(id);
  if (queue.size && !timer) timer = setTimeout(() => void flush(), 40);
}
/** Önbellekteki tarife (bilinmiyorsa null). */
export const cachedPlan = (id?: string | null): PlanId | null => (id ? cache.get(id) ?? null : null);
/** Üyelik değişince (ör. çıkış / giriş) önbelleği temizler. */
export const forgetPlan = (id?: string | null) => { if (id) cache.delete(id); };

export function usePlanOf(id?: string | null): PlanId | null {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!id) return;
    listeners.add(bump);
    requestPlans([id]);
    return () => { listeners.delete(bump); };
  }, [id]);
  return cachedPlan(id);
}

export const planLabel = (p: PlanId) => (p === 'business' ? 'Firma Pro' : 'Pro');

export function ProBadge({ plan, small }: { plan: PlanId | null; small?: boolean }) {
  if (!plan) return null;
  return (
    <View style={[s.badge, small && s.small]} accessibilityLabel={`${tr(planLabel(plan))} ${tr('üye')}`}>
      <Icon name="award" size={small ? 10 : 12} color={color.tealText} />
      <PlainText style={[s.t, small && { fontSize: 10.5 }]}>{tr(planLabel(plan))}</PlainText>
    </View>
  );
}
/** Üye kimliğinden rozet (tarife önbellekten / sunucudan gelir). */
export function ProBadgeOf({ userId, small }: { userId?: string | null; small?: boolean }) {
  return <ProBadge plan={usePlanOf(userId)} small={small} />;
}

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: color.tealSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  small: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, gap: 3 },
  t: { fontFamily: font.bold, fontSize: 12, color: color.tealText },
});
