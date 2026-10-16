'use client';
import Link from 'next/link';
import { LIMITS } from '@/lib/data/constants';
import { useMarket } from './MarketProvider';
export function PremiumView() {
 const { profile } = useMarket(); const limits = profile?.is_premium ? LIMITS.prem : LIMITS.free;
 return <><h1>Üyelik ve ilan hakları</h1><p className="lead">Başlangıç döneminde ilan vermek ücretsiz. Sürpriz ücret veya satış komisyonu alınmaz.</p>
 <div className="panel"><h2>{profile?.is_premium ? 'Premium hesabın' : 'Ücretsiz hesap'}</h2><ul className="clean"><li>Aynı anda {limits.listings} yayında veya duraklatılmış ilan</li><li>İlan başına {limits.photos} fotoğraf</li><li>Mesajlaşma, favoriler ve kayıtlı aramalar</li><li>Karşılıklı onaylanan satışlardan sonra değerlendirme</li></ul><p><Link className="btn" href="/ilan-ver">İlan ver</Link></p></div>
 <p className="note">Şu anda kart bilgisi veya ödeme almıyoruz. Ücretli paketler açılırsa fiyat ve koşullar satın alma öncesinde açıkça gösterilecek. Güven puanı ve doğrulama rozetleri satın alınamaz.</p></>;
}
