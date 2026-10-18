'use client';
import { useLanguage } from "@/components/LanguageProvider";

import { LIMITS } from '@/lib/data/constants';
import { useMarket } from './MarketProvider';
export function PremiumView() {
  const { t: tr, language } = useLanguage();

 const { profile } = useMarket(); const limits = profile?.is_premium ? LIMITS.prem : LIMITS.free;
 return <><h1>{tr("Üyelik ve ilan hakları")}</h1><p className="lead">{tr("Başlangıç döneminde ilan vermek ücretsiz. Sürpriz ücret veya satış komisyonu alınmaz.")}</p>
 <div className="panel"><h2>{profile?.is_premium ? tr("Premium hesabın") : tr("Ücretsiz hesap")}</h2><ul className="clean"><li>{tr("Aynı anda ")}{limits.listings} {tr(" yayında veya duraklatılmış ilan")}</li><li>{tr("İlan başına ")}{limits.photos} {tr(" fotoğraf")}</li><li>{tr("Mesajlaşma, favoriler ve kayıtlı aramalar")}</li><li>{tr("Karşılıklı onaylanan satışlardan sonra değerlendirme")}</li></ul><p><a className="btn" href="/ilan-ver">{tr("İlan ver")}</a></p></div>
 <p className="note">{tr("Şu anda kart bilgisi veya ödeme almıyoruz. Ücretli paketler açılırsa fiyat ve koşullar satın alma öncesinde açıkça gösterilecek. Güven puanı ve doğrulama rozetleri satın alınamaz.")}</p></>;
}
