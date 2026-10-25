'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { COORDS } from '@/lib/data/constants';
import { getSupabase } from '@/lib/supabase/client';

// Türkiye için sade enlem/boylam dağılım haritası: her il, ilan sayısıyla orantılı bir daire.
const W = 900, H = 420, LON0 = 25.5, LON1 = 45, LAT0 = 35.7, LAT1 = 42.3;
const x = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * W;
const y = (lat: number) => H - ((lat - LAT0) / (LAT1 - LAT0)) * H;

export function CityMap({ onPick }: { onPick: (city: string) => void }) {
  const { t: tr } = useLanguage();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setError(true); return; }
    let alive = true;
    supabase.from('listings').select('city').eq('status', 'active').eq('moderation_status', 'approved').limit(5000)
      .then(({ data, error: e }: { data: { city: string }[] | null; error: unknown }) => {
        if (!alive) return;
        if (e || !data) { setError(true); return; }
        const c: Record<string, number> = {};
        for (const r of data) c[r.city] = (c[r.city] ?? 0) + 1;
        setCounts(c);
      });
    return () => { alive = false; };
  }, []);

  const points = useMemo(
    () => Object.entries<number>(counts ?? {}).filter(([c]) => COORDS[c]).sort((a, b) => b[1] - a[1]),
    [counts],
  );
  const max = points[0]?.[1] ?? 1;

  if (error) return <div className="empty" role="alert">{tr('Harita yüklenemedi.')}</div>;
  if (!counts) return <div className="empty" role="status">{tr('Harita yükleniyor…')}</div>;
  if (!points.length) return <div className="empty">{tr('Haritada gösterilecek ilan yok.')}</div>;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={tr('İllere göre ilan haritası')} style={{ width: '100%', height: 'auto', background: 'var(--card, #fff)', border: '1px solid var(--line, #ddd)', borderRadius: 8 }}>
        {points.map(([city, n]) => {
          const [lat, lon] = COORDS[city];
          const r = 8 + 22 * Math.sqrt(n / max);
          return (
            <g key={city} tabIndex={0} role="button" aria-label={`${city}: ${n}`} style={{ cursor: 'pointer' }}
              onClick={() => onPick(city)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(city); } }}>
              <circle cx={x(lon)} cy={y(lat)} r={r} fill="currentColor" opacity={0.25} stroke="currentColor" />
              <text x={x(lon)} y={y(lat) + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{n}</text>
              <text x={x(lon)} y={y(lat) - r - 3} textAnchor="middle" fontSize="11" fill="currentColor">{city}</text>
            </g>
          );
        })}
      </svg>
      <p className="sub" style={{ marginTop: 8 }}>{tr('Bir ile tıklayarak o ildeki ilanları listele. Konumlar il merkezidir, tam adres paylaşılmaz.')}</p>
    </div>
  );
}
