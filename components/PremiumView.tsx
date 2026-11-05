'use client';
import { useState } from 'react';
import { useLanguage } from "@/components/LanguageProvider";
import { useMarket } from './MarketProvider';
import { FREE, PLANS, activePlan, money, yearlyPerMonth, yearlyTotal, type Period } from '@/lib/plans';

export function PremiumView() {
  const { t: tr, language } = useLanguage();
  const { profile } = useMarket();
  const [period, setPeriod] = useState<Period>('monthly');
  const lang = language === 'en' || language === 'de' ? language : 'tr';
  const current = activePlan(profile as never);
  const [notice, setNotice] = useState(false);
  return <div className="premium-page">
    <h1>Makinasal Premium</h1>
    <p className="lead">{tr("İlanların ve firman üstte görünsün, yapay zeka asistanı profilini ve ilanlarını güçlendirsin.")}</p>
    <div className="premium-toggle" role="tablist">
      {(['monthly', 'yearly'] as Period[]).map(p => <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}>{tr(p === 'monthly' ? 'Aylık' : 'Yıllık')}{p === 'yearly' ? <span>{tr('2 ay bedava')}</span> : null}</button>)}
    </div>
    <div className="premium-plans">
      {PLANS.map(p => {
        const mine = current === p.id;
        return <section key={p.id} className={`panel premium-plan${p.id === 'business' ? ' featured' : ''}`}>
          <header><h2>{tr(p.name)}</h2>{p.id === 'business' ? <span className="premium-tag">{tr('Şirketler için')}</span> : null}</header>
          <p className="sub">{tr(p.tagline)}</p>
          <p className="premium-price">{money(period === 'yearly' ? yearlyTotal(p) : p.monthly, lang)} <small>/ {tr(period === 'yearly' ? 'yıl' : 'ay')}</small></p>
          <p className="premium-per">{period === 'yearly' ? `${tr('Aylık')} ${money(yearlyPerMonth(p), lang)}` : `${tr('Yıllık öderseniz')} ${money(yearlyPerMonth(p), lang)} / ${tr('ay')}`}</p>
          <ul className="premium-features">{p.features.map(f => <li key={f}>{tr(f)}</li>)}</ul>
          <button type="button" className="btn" disabled={mine} onClick={() => setNotice(true)}>{tr(mine ? 'Mevcut tarifen' : 'Bu tarifeyi seç')}</button>
        </section>;
      })}
    </div>
    {notice ? <p className="note" role="status">{tr('Premium satın alma, ödeme altyapısı ve sözleşmeler onaylandığında açılacak. Şu anda kart bilgisi alınmıyor.')}</p> : null}
    <section className="panel premium-free"><h2>{tr('Ücretsiz üyelik')}</h2><ul className="clean"><li>{FREE.listings} {tr('ilan hakkı')}, {tr('ilan başına')} {FREE.photos} {tr('fotoğraf')}</li><li>{tr("Mesajlaşma, favoriler ve kayıtlı aramalar")}</li><li>{tr('İş ağında talep ve teklif')}</li></ul><p><a className="btn" href="/ilan-ver">{tr("İlan ver")}</a></p></section>
    <p className="note">{tr('Yapay zeka asistanı premium üyelere mobil uygulamada sunulur.')} {tr('Fiyatlar Türk lirasıdır. Güven puanı ve doğrulama rozetleri satın alınamaz; premium yalnızca görünürlük ve araçlar sağlar.')}</p>
  </div>;
}
