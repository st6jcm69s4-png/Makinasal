import type { Seller } from './types';
export const SELLERS: Record<string, Seller> = {
 "A": {
  "name": "Anadolu İş Makineleri",
  "type": "Kurumsal",
  "ver": true,
  "prem": true,
  "s": 4.8,
  "b": 4.7,
  "deals": 42,
  "rep": 0,
  "city": "Ankara",
  "since": 2021,
  "reviews": [
   {
    "who": "Ömer D.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Makine anlatıldığı gibiydi, belgeler eksiksiz çıktı.",
    "date": "2 hafta önce",
    "tags": [
     "İlana uygun çıktı",
     "Belgeler tamdı"
    ]
   },
   {
    "who": "Kemal A.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Yerinde incelememe izin verdi, pazarlık makuldü.",
    "date": "1 ay önce",
    "tags": [
     "Hızlı cevap verdi"
    ]
   },
   {
    "who": "Burak S.",
    "role": "Alıcı",
    "rating": 4,
    "text": "Teslimat bir gün gecikti ama haber verdi.",
    "date": "2 ay önce",
    "tags": []
   }
  ]
 },
 "B": {
  "name": "Mehmet K.",
  "type": "Bireysel",
  "ver": true,
  "s": 4.3,
  "b": 4.4,
  "deals": 6,
  "rep": 0,
  "city": "İstanbul",
  "since": 2023,
  "reviews": [
   {
    "who": "Ali R.",
    "role": "Alıcı",
    "rating": 4,
    "text": "Dürüst anlattı, makine temiz çıktı.",
    "date": "1 ay önce",
    "tags": [
     "İlana uygun çıktı"
    ]
   }
  ]
 },
 "C": {
  "name": "Yeni hesap",
  "type": "Bireysel",
  "ver": false,
  "s": null,
  "b": null,
  "deals": 0,
  "rep": 0,
  "city": "Bursa",
  "since": 2026,
  "reviews": []
 },
 "D": {
  "name": "Konya Makine Pazarı",
  "type": "Kurumsal",
  "ver": true,
  "s": 4.6,
  "b": 4.5,
  "deals": 18,
  "rep": 0,
  "city": "Konya",
  "since": 2022,
  "reviews": [
   {
    "who": "Hüseyin T.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Garantili satış yaptılar, servis desteği verdiler.",
    "date": "3 hafta önce",
    "tags": [
     "Belgeler tamdı"
    ]
   },
   {
    "who": "Nazlı Y.",
    "role": "Alıcı",
    "rating": 4,
    "text": "Fiyat tutarlıydı, ilanla telefondaki fiyat aynıydı.",
    "date": "2 ay önce",
    "tags": [
     "Fiyat tutarlıydı"
    ]
   }
  ]
 },
 "E": {
  "name": "Hasan T.",
  "type": "Bireysel",
  "ver": true,
  "s": 4.1,
  "b": 4,
  "deals": 3,
  "rep": 0,
  "city": "Adana",
  "since": 2024,
  "reviews": []
 },
 "F": {
  "name": "Vinç Dünyası Ltd.",
  "type": "Kurumsal",
  "ver": true,
  "prem": true,
  "s": 4.9,
  "b": 4.8,
  "deals": 57,
  "rep": 0,
  "city": "İzmir",
  "since": 2019,
  "reviews": [
   {
    "who": "Cemal B.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Periyodik kontrol raporu ve bakım kayıtlarıyla teslim ettiler.",
    "date": "1 hafta önce",
    "tags": [
     "Belgeler tamdı",
     "İlana uygun çıktı"
    ]
   },
   {
    "who": "Sevgi K.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Sorularıma aynı gün cevap verdiler.",
    "date": "1 ay önce",
    "tags": [
     "Hızlı cevap verdi"
    ]
   }
  ]
 },
 "G": {
  "name": "Beton Ekipman A.Ş.",
  "type": "Kurumsal",
  "ver": true,
  "prem": true,
  "s": 4.5,
  "b": 4.5,
  "deals": 26,
  "rep": 1,
  "city": "İstanbul",
  "since": 2020,
  "reviews": [
   {
    "who": "Erkan P.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Mikser yenilenmiş çıktı, ilandaki gibi.",
    "date": "1 ay önce",
    "tags": [
     "İlana uygun çıktı"
    ]
   },
   {
    "who": "Tolga M.",
    "role": "Alıcı",
    "rating": 2,
    "text": "Boru takımı eksik teslim edildi, sonra tamamladılar.",
    "date": "3 ay önce",
    "tags": []
   }
  ]
 },
 "H": {
  "name": "Ali V.",
  "type": "Bireysel",
  "ver": false,
  "s": 2.6,
  "b": 2.9,
  "deals": 4,
  "rep": 3,
  "city": "Mersin",
  "since": 2025,
  "reviews": [
   {
    "who": "Yusuf C.",
    "role": "Alıcı",
    "rating": 1,
    "text": "Ön ödeme istedi, makineyi göstermedi.",
    "date": "1 ay önce",
    "tags": []
   },
   {
    "who": "Mustafa D.",
    "role": "Alıcı",
    "rating": 2,
    "text": "Telefondaki fiyat ilandakinden farklıydı.",
    "date": "2 ay önce",
    "tags": []
   }
  ]
 },
 "I": {
  "name": "Gaziantep Tır Galerisi",
  "type": "Kurumsal",
  "ver": true,
  "s": 4.4,
  "b": 4.3,
  "deals": 31,
  "rep": 0,
  "city": "Gaziantep",
  "since": 2018,
  "reviews": [
   {
    "who": "Recep A.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Çekici temiz çıktı, ekspertize götürmeme izin verdiler.",
    "date": "2 hafta önce",
    "tags": [
     "İlana uygun çıktı"
    ]
   },
   {
    "who": "Zeki F.",
    "role": "Alıcı",
    "rating": 4,
    "text": "Fiyat pazarlığı makuldü.",
    "date": "2 ay önce",
    "tags": [
     "Fiyat tutarlıydı"
    ]
   }
  ]
 },
 "J": {
  "name": "Ege Forklift",
  "type": "Kurumsal",
  "ver": true,
  "s": 4.7,
  "b": 4.6,
  "deals": 22,
  "rep": 0,
  "city": "İzmir",
  "since": 2020,
  "reviews": [
   {
    "who": "Nuri S.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Forklift bakımlı ve ilandaki saatle uyumlu çıktı.",
    "date": "1 ay önce",
    "tags": [
     "İlana uygun çıktı"
    ]
   }
  ]
 },
 "K": {
  "name": "Serkan Y.",
  "type": "Bireysel",
  "ver": true,
  "s": 4,
  "b": 4.2,
  "deals": 2,
  "rep": 0,
  "city": "Bursa",
  "since": 2024,
  "reviews": []
 },
 "L": {
  "name": "Çelik Yedek Parça",
  "type": "Kurumsal",
  "ver": true,
  "s": 4.6,
  "b": 4.4,
  "deals": 35,
  "rep": 0,
  "city": "Ankara",
  "since": 2020,
  "reviews": [
   {
    "who": "Orhan G.",
    "role": "Alıcı",
    "rating": 5,
    "text": "Parça numarası uyumluydu, iade koşulunu yazılı verdiler.",
    "date": "3 hafta önce",
    "tags": [
     "Belgeler tamdı"
    ]
   }
  ]
 },
 "M": {
  "name": "Lastik Merkezi Ltd.",
  "type": "Kurumsal",
  "ver": true,
  "s": 4.4,
  "b": 4.3,
  "deals": 48,
  "rep": 0,
  "city": "İstanbul",
  "since": 2019,
  "reviews": [
   {
    "who": "Fikret Ö.",
    "role": "Alıcı",
    "rating": 4,
    "text": "Lastikler yeni üretimdi, DOT yılı ilandaki gibiydi.",
    "date": "1 ay önce",
    "tags": [
     "İlana uygun çıktı"
    ]
   }
  ]
 },
 "N": {
  "name": "Yol Yardım Kurtarıcı",
  "type": "Kurumsal",
  "ver": true,
  "s": 4.7,
  "b": 4.6,
  "deals": 15,
  "rep": 0,
  "city": "Ankara",
  "since": 2021,
  "reviews": []
 },
 "O": {
  "name": "Murat B.",
  "type": "Bireysel",
  "ver": true,
  "s": 4.2,
  "b": 4.1,
  "deals": 5,
  "rep": 0,
  "city": "İzmir",
  "since": 2023,
  "reviews": []
 },
 "ME": {
  "name": "Sen",
  "type": "Bireysel",
  "ver": false,
  "prem": false,
  "s": null,
  "b": null,
  "bn": 0,
  "deals": 0,
  "rep": 0,
  "city": "İstanbul",
  "since": 2026,
  "reviews": []
 }
};
