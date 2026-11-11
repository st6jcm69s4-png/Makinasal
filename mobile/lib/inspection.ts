/**
 * Alıcı için ekspertiz kontrol listesi: makineyi görmeye gidince telefonda madde madde işaretlenir.
 * Maddeler makine grubuna göre değişir. Sonuç yalnızca telefonda saklanır (AsyncStorage), sunucuya gitmez.
 */
import { groupOf } from './techSpecs';

export type InspectSection = { title: string; items: string[] };

const DOCS: InspectSection = {
  title: 'Belgeler ve kimlik',
  items: [
    'Seri / şasi numarası ilanla ve belgeyle aynı',
    'Fatura veya ruhsat satıcının adına',
    'Rehin, haciz veya leasing kaydı yok',
    'Çalışma saati / km göstergesi tutarlı',
  ],
};
const ENGINE: InspectSection = {
  title: 'Motor',
  items: [
    'Soğukken ilk marşta çalışıyor',
    'Egzozdan mavi veya beyaz duman gelmiyor',
    'Yağ, su ve yakıt kaçağı yok',
    'Yağ çubuğunda su ya da köpük yok',
    'Motor sesinde vuruntu yok',
  ],
};
const HYD: InspectSection = {
  title: 'Hidrolik',
  items: [
    'Silindir millerinde çizik ve yağ sızıntısı yok',
    'Hortum ve rakorlarda çatlak, terleme yok',
    'Kollar yük altında kendiliğinden düşmüyor',
    'Pompa sesinde uğultu yok, hareketler güçlü',
  ],
};
const CAB: InspectSection = {
  title: 'Kabin ve elektrik',
  items: [
    'Gösterge panelinde arıza ışığı yok',
    'Klima, farlar ve silecekler çalışıyor',
    'Kumanda kolları boşluksuz',
    'Camlar ve kabin gövdesi sağlam',
  ],
};
const TRACKS: InspectSection = {
  title: 'Yürüyüş takımı',
  items: [
    'Palet pabuçları ve zincir aşınması kabul edilebilir',
    'Makara, cer dişlisi ve istikamet tekeri sağlam',
    'Yürüyüş motorlarında kaçak yok, iki yöne eşit çekiyor',
    'Kule (dönüş) boşluğu yok',
  ],
};
const WHEELS: InspectSection = {
  title: 'Lastik, aks ve fren',
  items: [
    'Lastiklerde diş derinliği yeterli, yarık yok',
    'Aks ve diferansiyelde kaçak yok',
    'Frenler ve el freni tutuyor',
    'Direksiyonda boşluk yok',
    'Vites geçişleri sarsıntısız',
  ],
};
const ATTACH: InspectSection = {
  title: 'Bom, kova ve ataşman',
  items: [
    'Bom ve kolda kaynak, çatlak izi yok',
    'Pim ve burçlarda boşluk yok',
    'Kova tırnakları ve tabanı sağlam',
    'Kırıcı hattı ve hızlı bağlantı çalışıyor',
  ],
};
const LIFT: InspectSection = {
  title: 'Kaldırma düzeni',
  items: [
    'Periyodik kontrol raporu güncel',
    'Halat, zincir ve kancada aşınma yok',
    'Yük ve devrilme emniyetleri çalışıyor',
    'Destek ayakları sağlam, kaçırmıyor',
    'Bom uzarken sarsıntı ve ses yok',
  ],
};
const BODY: InspectSection = {
  title: 'Şasi ve kasa',
  items: [
    'Şaside kaynak, eğrilik ve çürüme yok',
    'Damper / kasa düzgün kalkıp iniyor',
    'Makas, körük ve amortisörler sağlam',
    'Muayene ve egzoz emisyonu geçerli',
  ],
};
const TEST: InspectSection = {
  title: 'Deneme',
  items: [
    'En az 20 dakika yük altında çalıştırdım',
    'Hararet ve yağ basıncı normal kaldı',
    'Tüm hareketleri sonuna kadar denedim',
  ],
};

const TRACKED = new Set(['excavators', 'earthmoving', 'drilling', 'forestry']);
const LIFTING = new Set(['cranes', 'platforms', 'forklifts', 'telehandlers']);
const ROAD = new Set(['trucks', 'trailers', 'dumpers']);

export function inspectionFor(category: string): InspectSection[] {
  const g = groupOf(category) ?? '';
  if (ROAD.has(g)) return [DOCS, ENGINE, WHEELS, BODY, CAB, TEST];
  if (LIFTING.has(g)) return [DOCS, ENGINE, HYD, LIFT, WHEELS, CAB, TEST];
  if (TRACKED.has(g)) return [DOCS, ENGINE, HYD, TRACKS, ATTACH, CAB, TEST];
  return [DOCS, ENGINE, HYD, WHEELS, ATTACH, CAB, TEST];
}

/** 'ok' = sorun yok, 'bad' = sorun var, yok = bakılmadı */
export type Mark = 'ok' | 'bad';
export type Marks = Record<string, Mark>;
export const inspectKey = (listingId: string) => `mk-inspect:${listingId}`;
