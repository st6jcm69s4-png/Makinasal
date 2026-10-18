'use client';
import { useLanguage } from "@/components/LanguageProvider";


import type { ReactNode } from 'react';
import type { Listing } from '@/lib/data/types';
import { formatNum, formatScore, formatTL } from '@/lib/format';
import { distanceKm, distanceLabel } from '@/lib/geo';
import { cardTitle, usageLabel, usageUnit } from '@/lib/listing';
import { bestIdx } from '@/lib/market';
import { isPartCategory } from '@/lib/pricing';
import { trustLevel } from '@/lib/trust';
import { useMarket } from './MarketProvider';
import { Pill, toneClass } from './ui';

export function CompareView() {
  const { t: tr, language } = useLanguage();

  const { cmp, find, sellers, stats, myCity, removeCmp, ready } = useMarket();
  const items = cmp.map((k) => find(k)).filter((x): x is Listing => !!x);
  if (!ready) return <div className="empty">{tr("Yükleniyor…")}</div>;
  if (items.length < 2) {
    return (
      <>
        <h1>{tr("İlan karşılaştırma")}</h1>
        <div className="empty" style={{ marginTop: 16 }}>{tr("Karşılaştırmak için en az 2 ilan seç. İlan kartlarındaki ")}<b>⇅</b> {tr(" düğmesine bas. ")}<a className="linkbtn" href="/ilanlar">{tr("İlanlara git")}</a></div>
      </>
    );
  }
  const allMach = items.every((l) => !isPartCategory(l.cat));
  const sameUnit = allMach && items.every((l) => usageUnit(l) === usageUnit(items[0]));
  const rows: { label: string; cells: ReactNode[]; best: number }[] = [];
  const row = (label: string, cells: ReactNode[], best = -1) => rows.push({ label, cells, best });
  row('Fiyat', items.map((l) => <b key={l.id}>{formatTL(l.price, language)}</b>), bestIdx(items.map((l) => l.price), 'min'));
  row('Model yılı', items.map((l) => l.year ?? '–'), bestIdx(items.map((l) => l.year ?? null), 'max'));
  row('Kullanım', items.map((l) => (isPartCategory(l.cat) ? '–' : usageLabel(l, language) || '–')), sameUnit ? bestIdx(items.map((l) => l.use ?? null), 'min') : -1);
  row('Şehir', items.map((l) => l.city));
  row('Uzaklık', items.map((l) => distanceLabel(myCity, l.city) || '–'), bestIdx(items.map((l) => distanceKm(myCity, l.city)), 'min'));
  row('Satıcı', items.map((l) => sellers[l.sel]?.name ?? '–'));
  row('Satıcı puanı', items.map((l) => formatScore(sellers[l.sel]?.s, language)), bestIdx(items.map((l) => sellers[l.sel]?.s ?? null), 'max'));
  row('Güven seviyesi', items.map((l) => { const v = sellers[l.sel] ? trustLevel(sellers[l.sel]) : null; return v ? <Pill key={l.id} cls={toneClass(v.tone)}>{tr(v.label)}</Pill> : '–'; }));
  row('Seri / şasi', items.map((l) => (isPartCategory(l.cat) ? '–' : l.serial ? <Pill key={l.id} cls="good">{tr("Beyan edildi")}</Pill> : 'Beyan yok')));
  row('Takas', items.map((l) => (l.takas ? 'Kabul edilir' : 'Belirtilmedi')));
  row('Piyasa fiyatı', items.map((l) => { const f = stats.flag(l.price, l.cat); return f === 'low' ? <Pill key={l.id} cls="bad">{tr("Çok düşük, dikkat")}</Pill> : f === 'high' ? <Pill key={l.id} cls="warn">{tr("Ortalamanın üstünde")}</Pill> : f === 'ok' ? <Pill key={l.id} cls="good">{tr("Normal aralıkta")}</Pill> : '–'; }));
  row('Son doğrulama', items.map((l) => (l.conf === 0 ? 'Bugün' : `${formatNum(l.conf, language)} gün önce`)));
  return (
    <>
      <h1>{tr("İlan karşılaştırma")}</h1>
      <div className="panel scroll" style={{ marginTop: 16 }}>
        <table className="cmpt">
          <thead>
            <tr><th></th>{items.map((l) => (
              <th key={l.id}><a className="linkbtn" href={`/ilanlar/${l.id}`}>{cardTitle(l)}</a><br /><button type="button" className="btn ghost sm" onClick={() => removeCmp(String(l.id))}>{tr("Çıkar")}</button></th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}><th>{tr(r.label)}</th>{r.cells.map((c, i) => <td key={i}>{c}{i === r.best ? <> <Pill cls="good">{tr("En iyi")}</Pill></> : null}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub">{tr("\"En iyi\" işareti yalnızca fiyat, yıl, kullanım, uzaklık ve satıcı puanı için konur. Ürünü yerinde görmeden karar verme.")}</p>
    </>
  );
}
