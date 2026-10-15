'use client';

import { LIMITS } from '@/lib/data/constants';
import { useMarket } from './MarketProvider';
import { Pill } from './ui';

export function PremiumView() {
  const { profile } = useMarket();
  const prem = !!profile?.is_premium;
  return (
    <>
      <h1>Premium</h1>
      <p className="lead">Premium görünürlük ve araçlar verir. Güven puanı ve doğrulanmış rozeti para ile satın alınamaz.</p>
      <div className="three" style={{ marginTop: 18 }}>
        <div className={`panel${!prem ? '' : ''}`}>
          <h3>Ücretsiz</h3><div className="big" style={{ margin: '10px 0' }}>0 ₺</div>
          <ul className="clean"><li>{LIMITS.free.listings} aktif ilan</li><li>İlan başına {LIMITS.free.photos} fotoğraf</li><li>Doğrulama ve güven puanı</li><li>Temel arama sonuçlarında görünür</li></ul>
        </div>
        <div className="panel prem">
          <Pill cls="prem">Önerilen</Pill><h3 style={{ marginTop: 8 }}>Premium</h3>
          <div className="big" style={{ margin: '10px 0' }}>299 ₺<span className="sub" style={{ font: '400 15px var(--f-body)' }}> / ay</span></div>
          <ul className="clean"><li>30 aktif ilan</li><li>İlan başına 20 fotoğraf</li><li>İlanlar &quot;Öne çıkan&quot; etiketiyle önde gösterilir</li><li>Premium satıcı rozeti</li><li>İlan istatistikleri: görüntülenme ve telefon sayısı</li></ul>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button className="btn" type="button" disabled>{prem ? 'Premium üyesin' : 'Premium’a geç (yakında)'}</button>
            <span className="out">{prem ? 'Premium özelliklerin açık.' : 'Ödeme altyapısı henüz açık değil.'}</span>
          </div>
        </div>
        <div className="panel">
          <Pill>Yakında</Pill><h3 style={{ marginTop: 8 }}>Kurumsal mağaza</h3><div className="big" style={{ margin: '10px 0' }}>Teklif</div>
          <ul className="clean"><li>Sınırsız ilan</li><li>Toplu ilan yükleme ve taşıma</li><li>Mağaza sayfası ve logo</li><li>Birden fazla kullanıcı</li></ul>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Tek ilanı öne çıkar</h3>
        <p className="sub" style={{ margin: '8px 0 0' }}>Premium olmayan üyeler tek bir ilanı 7 günlüğüne öne çıkarabilecek: 99 ₺. Ödeme açılınca Profil sayfasında ilanının yanında &quot;Öne çıkar&quot; düğmesi olarak görünecek.</p>
      </div>
      <div className="note" style={{ marginTop: 16 }}>Fiyatlar örnektir, lansmanda belirlenecek. Şu an ödeme alınmıyor; premium ve öne çıkarma yalnızca sunucu tarafından, ödeme sonrası açılır, kullanıcı kendi hesabında açamaz. Gerçek sürümde ödeme lisanslı bir ödeme kuruluşu üzerinden alınır.</div>
    </>
  );
}
