import { MACHINE_CATEGORIES, PART_CATEGORIES } from "./data";
export const CATEGORY_GROUPS = [
  {
    id: "excavators",
    label: "Ekskavatörler",
    categories: [
      "Ekskavatör",
      "Mini ekskavatör",
      "Lastikli ekskavatör",
      "Uzun bom ekskavatör",
      "Amfibik ekskavatör",
    ],
  },
  {
    id: "loaders",
    label: "Yükleyiciler ve kazıcı yükleyiciler",
    categories: [
      "Beko Loder",
      "Lastikli yükleyici",
      "Mini yükleyici",
      "Paletli yükleyici",
    ],
  },
  {
    id: "earthmoving",
    label: "Dozer, greyder ve zemin kazı makineleri",
    categories: ["Dozer", "Greyder", "Skreyper", "Trencher (kanal kazıcı)"],
  },
  {
    id: "telehandlers",
    label: "Teleskopik yükleyiciler",
    categories: ["Manitou / teleskopik yükleyici"],
  },
  {
    id: "forklifts",
    label: "Forklift ve depo ekipmanları",
    categories: ["Forklift", "İstif makinesi", "Reach truck", "Transpalet"],
  },
  {
    id: "cranes",
    label: "Vinçler",
    categories: [
      "Vinç",
      "Mobil vinç",
      "Paletli vinç",
      "Kule vinç",
      "Hiab / araç üstü vinç",
    ],
  },
  {
    id: "platforms",
    label: "Platform ve personel yükselticiler",
    categories: [
      "Sepetli platform",
      "Makaslı platform",
      "Eklemli / teleskopik platform",
    ],
  },
  {
    id: "concrete",
    label: "Beton makineleri",
    categories: [
      "Beton (mikser ve pompa)",
      "Transmikser",
      "Beton pompası",
      "Sabit beton pompası",
      "Beton santrali",
      "Beton serme makinesi",
      "Shotcrete / püskürtme beton makinesi",
    ],
  },
  {
    id: "trucks",
    label: "Kamyonlar ve nakliye araçları",
    categories: [
      "Kamyon",
      "Damperli kamyon",
      "Kırkayak kamyon",
      "Çekici (tır)",
      "Kurtarıcı (oto çekici)",
      "Tanker",
      "Arazöz / su tankeri",
    ],
  },
  {
    id: "trailers",
    label: "Lowbed, dorse ve römorklar",
    categories: ["Lowbed", "Dorse / römork"],
  },
  {
    id: "dumpers",
    label: "Kaya kamyonları",
    categories: ["Belden kırma kaya kamyonu", "Rijit kaya kamyonu"],
  },
  {
    id: "road",
    label: "Yol, asfalt ve sıkıştırma makineleri",
    categories: [
      "Silindir",
      "Kompaktör",
      "Asfalt finişeri",
      "Asfalt frezesi",
      "Asfalt distribütörü",
      "Yol süpürme aracı",
      "Zemin stabilizasyon makinesi",
      "Yol çizgi makinesi",
    ],
  },
  {
    id: "drilling",
    label: "Sondaj, temel ve tünel makineleri",
    categories: [
      "Fore kazık makinesi",
      "Mini kazık / ankraj makinesi",
      "Diyafram duvar makinesi",
      "Sondaj makinesi",
      "Tünel açma makinesi (TBM)",
      "Delici jumbo",
    ],
  },
  {
    id: "processing",
    label: "Kırma, eleme ve ataşmanlar",
    categories: [
      "Kırıcı / delici ataşman",
      "Kırma eleme tesisi",
      "Taş kırma makinesi",
      "Elek / yıkama tesisi",
      "Konveyör / bant sistemi",
    ],
  },
  {
    id: "power",
    label: "Enerji ve saha ekipmanları",
    categories: [
      "Jeneratör",
      "Kompresör",
      "Motopomp / su pompası",
      "Işık kulesi",
      "Kaynak makinesi",
      "Endüstriyel temizlik makinesi",
    ],
  },
  {
    id: "agriculture",
    label: "Tarım makineleri",
    categories: ["Traktör", "Biçerdöver", "Tarım makinesi / ekipmanı"],
  },
  { id: "forestry", label: "Orman makineleri", categories: ["Orman makinesi"] },
  {
    id: "ports",
    label: "Liman ve konteyner ekipmanları",
    categories: ["Liman / konteyner elleçleme makinesi"],
  },
  {
    id: "other",
    label: "Diğer iş makineleri",
    categories: ["Diğer iş makinesi"],
  },
  {
    id: "parts",
    label: "Yedek parça, lastik ve jant",
    categories: [...PART_CATEGORIES],
  },
] as const;
export function categoryValues(selection: string): string[] {
  if (selection === "group:machines") return [...MACHINE_CATEGORIES];
  if (selection.startsWith("group:"))
    return [
      ...(CATEGORY_GROUPS.find((g) => "group:" + g.id === selection)
        ?.categories ?? []),
    ];
  return [...MACHINE_CATEGORIES, ...PART_CATEGORIES, "Diğer"].includes(
    selection as never,
  )
    ? [selection]
    : [];
}
export function categoryLabel(selection: string) {
  if (selection === "group:machines") return "İş makinesi";
  return (
    CATEGORY_GROUPS.find((g) => "group:" + g.id === selection)?.label ??
    selection
  );
}
export function categoryMatches(actual: string, selection: string) {
  return (
    selection === "Tümü" ||
    selection === "" ||
    categoryValues(selection).includes(actual)
  );
}
const list = (value: string) => value.split("|");
// Catalogue includes current and legacy names for used machinery. Suggestions are not a product-availability guarantee.
const BRANDS: Record<string, string[]> = {
  excavators: list(
    "Caterpillar|CASE|New Holland|John Deere|Komatsu|Volvo|Hitachi|Develon|Doosan|Hyundai|JCB|Hidromek|Liebherr|SANY|XCMG|LiuGong|Zoomlion|Sunward|SDLG|Lovol|Sinomach|Yanmar|Kubota|Takeuchi|Bobcat|Wacker Neuson|Mecalac|Kobelco|Kato|Sumitomo|IHI|Hanix|Terex|Schaeff|Atlas|O&K|Fiat-Hitachi|Fiat-Kobelco|Samsung|Daewoo|Link-Belt|Gradall|Menzi Muck|Kaiser|Euromach|XGMA|Yuchai|BEML",
  ),
  loaders: list(
    "Caterpillar|Komatsu|Volvo|JCB|Hidromek|CASE|New Holland|John Deere|Liebherr|Doosan|Develon|Hyundai|LiuGong|XCMG|SDLG|SANY|Zoomlion|Lovol|SEM|XGMA|Lonking|Sinomach|Changlin|Chenggong|Bobcat|Gehl|Mustang|Manitou|Takeuchi|Kubota|Yanmar|Wacker Neuson|Kramer|Weidemann|Schäffer|Giant|Avant|MultiOne|Venieri|Mecalac|Terex|Fermec|Fiat-Allis|Fiat-Hitachi|Thomas|Ditch Witch|Toro|Sherpa|Cast|Palazzani|Ahlmann|Huddig|Lännen|Çukurova|Bull|ACE|Mahindra|Escorts",
  ),
  earthmoving: list(
    "Caterpillar|Komatsu|Liebherr|John Deere|CASE|New Holland|Dressta|Shantui|LiuGong|XCMG|SANY|Zoomlion|BEML|HBXG|Chetra|ChTZ|Fiat-Allis|Allis-Chalmers|International Harvester|Terex|HBM-NOBAS|Hidromek|Champion|Volvo|Mitsubishi|Vermeer|Ditch Witch|Tesmec|Barreto|Trencor",
  ),
  telehandlers: list(
    "Manitou|Merlo|JCB|Dieci|Bobcat|Caterpillar|JLG|Genie|Magni|Faresin|Kramer|Liebherr|New Holland|CASE|Case IH|John Deere|Claas|Massey Ferguson|Deutz-Fahr|Fendt|Gehl|AUSA|Haulotte|SANY|XCMG|Sunward|Sennebogen|Wacker Neuson|Weidemann|Pettibone|Xtreme|Skyjack|Snorkel|Matbro|Sanderson|Sambron|Terexlift|Italmacchine|Komatsu|Doosan|Noblelift|LGMG|Sinoboom",
  ),
  forklifts: list(
    "Toyota|Linde|Still|Jungheinrich|Hyster|Yale|Crown|Mitsubishi|CAT Lift Trucks|Nissan|UniCarriers|TCM|Komatsu|Doosan|Bobcat|Hyundai|Clark|Hangcha|Heli|EP Equipment|Noblelift|Baoli|Maximal|Lonking|LiuGong|Tailift|Goodsense|FEELER|Artison|AUSA|Manitou|JCB|Agrimac|Kalmar|Konecranes|SANY|Combilift|Hubtex|Baumann|Bulmor|Bendi|Flexi|Aisle Master|Raymond|BT|Atlet|Rocla|CESAB|OM|OM-Pimespo|Steinbock|Desta|Heden|Nexen|Samuk|Hangzhou|Anhui|Pramac|Logitrans|Stöcklin|Sichelschmidt|Genkinger|Baka|Icem|Dambach|Fantuzzi|Svetruck",
  ),
  cranes: list(
    "Liebherr|Tadano|Grove|Manitowoc|Demag|Terex|Kato|Kobelco|Hitachi Sumitomo|Link-Belt|SANY|XCMG|Zoomlion|Sennebogen|Broderson|Shuttlelift|Galion|Locatelli|Marchetti|Ormig|JMG|Valla|Spierings|Maeda|UNIC|Jekko|Hoeflon|MiniGru|Potain|Comansa|Comedil|Wolffkran|Raimondi|Linden Comansa|Saez|Jaso|FM Gru|Vicario|Arcomet|Peiner|Zeppelin|Yongmao|Yongli|Dahan|Fushun|ACE|Escorts|TIL|Hiab|Palfinger|Fassi|Effer|HMF|PM|Copma|Amco Veba|Cormach|Furukawa|Soosan|Furkan|Hidrokon|Erkin|Asimato",
  ),
  platforms: list(
    "JLG|Genie|Haulotte|Skyjack|Snorkel|Dingli|Sinoboom|LGMG|Zoomlion|XCMG|SANY|Manitou|Niftylift|JCB|Airo|Imer|Iteco|MEC|Ballymore|Almac|Hinowa|CMC|Platform Basket|Teupen|Multitel|Palazzani|Oil & Steel|Socage|Ruthmann|Bronto Skylift|Palfinger|CTE|Isoli|Versalift|Klubb|Bizzocchi|Faraone|Easy Lift|Dino Lift|Cela|GSR|Böcker|Maber",
  ),
  concrete: list(
    "Putzmeister|Schwing|Stetter|Liebherr|Cifa|Sermac|SANY|Zoomlion|XCMG|JunJin|KCP|Everdigm|Concord|Alliance|Reed|Mayco|Blastcrete|Mecbo|Dawin|Betonstar|Elkon|MEKA|CONSTMACH|Fabo|Pi Makina|Semix|Güriş|İmer|Carmix|Fiori|Merlo|Dieci|Cemen Tech|Zimmerman|Simem|Cemco|Frumecar|Oru|Ocmer|Euromecc|Rapid|Wirtgen|Gomaco|Power Curbers|Guntert & Zimmerman|Somero|Ligchine|Normet|Putzmeister SPM|CIFA Spritz|Aliva",
  ),
  trucks: list(
    "Mercedes-Benz|MAN|Scania|Volvo Trucks|Renault Trucks|DAF|Iveco|Ford Trucks|BMC|Otokar|Isuzu|Hino|Mitsubishi Fuso|UD Trucks|Hyundai|Tata|Ashok Leyland|Mahindra|BharatBenz|Eicher|Force|AMW|SML Isuzu|Swaraj Mazda|Sinotruk|HOWO|Shacman|FAW|Dongfeng|Foton|JAC|JMC|CAMC|Dayun|BEIBEN|Hongyan|Chenglong|SANY|XCMG|BYD|Farizon|Geely|Nikola|Tesla|Freightliner|Western Star|Kenworth|Peterbilt|Mack|International|Autocar|Oshkosh|Navistar|Sterling|GMC|Chevrolet|Ford|Dodge|RAM|Volvo White|White|Brockway|Diamond T|Tatra|Kamaz|Ural|MAZ|KrAZ|ZIL|GAZ|BelAZ|Sisu|Ginaf|Terberg|Astra|ERF|Foden|Seddon Atkinson|Bedford|Leyland|Steyr|Berliet|Saviem|Magirus-Deutz|Hanomag-Henschel|Henschel|Roman|Raba|Csepel|FAP|Praga|Liaz|Star|Jelcz|Nissan Diesel|Nissan|SsangYong|Daewoo|Avia|Kia|Öztreyler",
  ),
  trailers: list(
    "Kässbohrer|Tırsan|Kögel|Krone|Schmitz Cargobull|Schwarzmüller|Fliegl|Faymonville|MAX Trailer|Goldhofer|Nooteboom|Broshuis|Doll|Scheuerle|Nicolas|Kamag|Cometto|Faymonville|Feldbinder|Spitzer|LAG|Magyar|Van Hool|Wielton|Fruehauf|Benalu|Legras|STAS|Langendorf|Carnehl|Meiller|Schmitz|Chereau|Lamberet|LeciTrailer|Guillén|SOR|Utility|Great Dane|Wabash|Vanguard|Hyundai Translead|Fontaine|Talbert|Trail King|Etnyre|CIMC|CIMC Vehicles|Kogel|Öztreyler|Özgül|Yalçın|Gürleşenyıl|Maksan|Serin|OKT|Alura|Yelsan|Nursan|Seyit Usta|Kässbohrer Transport Technik",
  ),
  dumpers: list(
    "Volvo|Caterpillar|Komatsu|Bell|Liebherr|Terex|Develon|Doosan|Hyundai|John Deere|Hydrema|AUSA|Wacker Neuson|Mecalac|Thwaites|JCB|Bergmann|Morooka|Yanmar|Kubota|IHI|Prinoth|Hitachi|BelAZ|BEML|XCMG|SANY|LiuGong|XGMA|Perlini|Astra|Euclid|Unit Rig|Wabco|LGMG|Tonly|XEMC|NHL|Sinotruk",
  ),
  road: list(
    "Wirtgen|Vögele|Hamm|Kleemann|Bomag|Dynapac|Ammann|Caterpillar|Volvo|ABG|Blaw-Knox|Ingersoll Rand|Bitelli|Marini|Fayat|Sakai|Sumitomo|LeeBoy|Roadtec|Astec|Weiler|Mauldin|Bergkamp|Etnyre|Rosco|XCMG|SANY|LiuGong|Shantui|Zoomlion|Sinomach|Hidromek|Çukurova|YTO|Wacker Neuson|Weber MT|Mikasa|Masalta|Belle|Altrad|Atlas Copco|Swepac|Bucher|Schmidt|Aebi Schmidt|Dulevo|Scarab|Johnston|Ravo|Mathieu|Tennant|Hako|Elgin|Global Environmental|Tymco|Boschung|Hofmann|Borum|Graco|Titan|MBW",
  ),
  drilling: list(
    "Bauer|Soilmec|Casagrande|Liebherr|Junttan|MAIT|IMT|Tescar|Comacchio|Fraste|Geax|Hütte|Klemm|Delmag|ABI|Banut|Llamada|FUNDEX|Enteco|SANY|XCMG|Zoomlion|Sunward|CRCHI|CRCC|Herrenknecht|Robbins|Terratec|Kawasaki|IHI|Komatsu|Hitachi Zosen|CREG|Sandvik|Epiroc|Atlas Copco|Furukawa|Junjin|Reedrill|Tamrock|Boart Longyear|Dando|Foremost|Schramm|Drillmec|Bentec|GHH|Resemin|Mine Master|Normet|Caterpillar|Ditch Witch|Vermeer|Tracto-Technik",
  ),
  processing: list(
    "Metso|Outotec|Nordberg|Lokomo|Sandvik|Fintec|Extec|Terex|Powerscreen|Finlay|Cedarapids|Cobra|EvoQuip|MPS|Kleemann|McCloskey|Tesab|Rubble Master|Rockster|Hartl|Keestrack|SBM|Lippmann|Eagle Crusher|Astec|Telsmith|KPI-JCI|Superior|Screen Machine|Anaconda|Portafill|MEKA|Fabo|CONSTMACH|General Makina|Uğurmak|Borataş|Pi Makina|Çenay|Galen|İnan Makina|MST|Epiroc|Atlas Copco|Rammer|Montabert|Furukawa|NPK|Soosan|Everdigm|Daemo|Indeco|MB Crusher|Simex|ALLU|Tabe|Okada|Miller|Engcon|Steelwrist|Rototilt|Kinshofer|Trevi Benne|VTN|Demarec|LaBounty|Genesis|ShearCore|Darda|Brokk|Husqvarna",
  ),
  power: list(
    "Caterpillar|Cummins|Perkins|Volvo Penta|John Deere|MTU|Rolls-Royce|Deutz|Doosan|Hyundai|Kohler|Rehlko|SDMO|FG Wilson|Pramac|Generac|Himoinsa|Aksa|Teksan|Genpower|Alimar|EMSA|Güçbir|Dalgakıran|Atlas Copco|Kaeser|Ingersoll Rand|Sullair|CompAir|Gardner Denver|Boge|ELGi|Chicago Pneumatic|ABAC|Fini|Mattei|Rotair|Doosan Portable Power|Airman|Denyo|Fusheng|Hitachi|Kobelco|Honda|Yamaha|Yanmar|Kubota|Wacker Neuson|BBA Pumps|Godwin|Xylem|Flygt|Tsurumi|Koshin|Grindex|Grundfos|Wilo|Gorman-Rupp|Varisco|Ebara|Caprari|Lowara|Pedrollo|Fronius|Lincoln Electric|Miller|ESAB|Kemppi|EWM|Fimer|Telwin|Gedik|Magmaweld|Askaynak|Kärcher|Nilfisk|Tennant|Hako|Fimap|Comac|IPC|Taski|Kränzle|Lavor|Dulevo|RPS|Trime|Generac Mobile",
  ),
  agriculture: list(
    "John Deere|New Holland|Case IH|Massey Ferguson|Fendt|Valtra|Claas|Deutz-Fahr|Same|Lamborghini Trattori|Hürlimann|Steyr|Lindner|Reform|Rigitrac|Antonio Carraro|Carraro|BCS|Ferrari|Pasquali|Goldoni|Landini|McCormick|Arbos|Lovol|YTO|Dongfeng|Zoomlion|Lutong|Jinma|Foton|LS|Kioti|Daedong|TYM|Branson|Kukje|Kubota|Iseki|Yanmar|Mitsubishi|Shibaura|Solis|Sonalika|Mahindra|TAFE|Escorts|Farmtrac|Powertrac|Preet|VST|Force|Eicher|Zetor|Ursus|Uzel|Başak|Tümosan|Erkunt|Hattat|TürkTraktör|Bozok|ArmaTrac|Belarus|MTZ|KhTZ|Kirovets|Rostselmash|Versatile|Buhler|Challenger|White|Allis-Chalmers|Oliver|David Brown|Ford|Fiat|International Harvester|Valmet|Bolinder-Munktell|Lanz|Hanomag|Fortschritt|Bizon|Sampo Rosenlew|Gleaner|Laverda|Fahr|Krone|Kuhn|Kverneland|Vicon|Amazone|Horsch|Lemken|Pöttinger|Fella|Maschio Gaspardo|Monosem|Great Plains|Väderstad|Sulky|Bogballe|Rauch|Joskin|Fliegl|Pichon|Trioliet|Strautmann|Storti|Faresin|Ocmis|Bauer|Ferbo|Alpler|Ünlü|İrtem|Özdöken|Kurt|Hisarlar|Kayhan Ertuğrul|Türkay|Öntar|Taral",
  ),
  forestry: list(
    "John Deere|Ponsse|Komatsu Forest|Tigercat|Rottne|Eco Log|Logset|Sampo Rosenlew|HSM|Welte|Gremo|Valmet|Timberjack|Caterpillar|Prentice|Barko|Weiler|Sennebogen|Liebherr|Hitachi|Doosan|Develon|Hyundai|Kobelco|Waratah|Log Max|Kesla|Nisula|AFM|SP Maskiner|Logmer|Sennebogen|Prinoth|FAE|Seppi|Ahwi|Rabaud|Bandit|Vermeer|Morbark|Jenz|Heizohack|Pezzolato|Albach|Doppstadt",
  ),
  ports: list(
    "Kalmar|Konecranes|Linde|Hyster|Toyota|SANY|XCMG|Liebherr|Terex|Fantuzzi|CVS Ferrari|SMV|Svetruck|Taylor|Hyster-Yale|ZPMC|Kone|Gottwald|Sennebogen|Mantsinen|Fuchs|Terberg|MOL|Tico|Capacity|Ottawa",
  ),
  parts: list(
    "Bosch Rexroth|Bosch|ZF|Dana|Carraro|Allison|Eaton|Parker|Danfoss|Sauer-Danfoss|Kawasaki|Nabtesco|Kayaba|KYB|Donaldson|Fleetguard|MANN-FILTER|Mahle|Hengst|Baldwin|WIX|Fil Filter|Sakura|Denso|Delphi|Garrett|BorgWarner|Holset|Cummins|Perkins|Deutz|Yanmar|Kubota|Isuzu|Mitsubishi|Scania|Volvo|Mercedes-Benz|Caterpillar|Komatsu|Hitachi|Hidromek|JCB|SANY|XCMG|LiuGong|Hyundai|Doosan|Develon|Liebherr|CASE|New Holland|SKF|FAG|INA|NSK|NTN|Koyo|Timken|Berco|ITM|ITR|VemaTrack|DuraTrack|ESCO|Hensley|MTG|BYG|Blumaq|Costex|CTP|TVH|Bepco|Donaldson|Valeo|Hella|Wabco|Knorr-Bremse|Febi|Diesel Technic|DT Spare Parts|Meyle|Elring|Victor Reinz|Gates|Continental|Dayco|Bando|Optibelt|Michelin|Bridgestone|Goodyear|Continental|Pirelli|BKT|Alliance|Trelleborg|Mitas|Nokian Tyres|Yokohama|Toyo|Hankook|Kumho|Maxam|Triangle|Linglong|Double Coin|Westlake|Advance|Aeolus|Petlas|Özka|Starmaxx|Lassa|Seha|CEAT|Apollo|JK Tyre|MRF|Titan|Firestone|Camso|Solideal|Galaxy|Carlisle|Armour|Techking|Nankang|Kenda|Roadstone|Nexen|Otani|Sailun|Deestone|Jantsa|Maxion|Accuride|Alcoa|Titan Wheels|GKN Wheels",
  ),
};
export function normalizeBrand(value: string) {
  let s = value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    cat: "caterpillar",
    catcaterpillar: "caterpillar",
    mercedes: "mercedesbenz",
    mercedesbenztrucks: "mercedesbenz",
    renaulttrucks: "renault",
    volvotrucks: "volvo",
    fordtrucks: "ford",
    faresinhandlers: "faresin",
    kogel: "kogel",
    doosanbobcat: "bobcat",
    caseconstruction: "case",
    deutzfahr: "deutzfahr",
  };
  return Object.prototype.hasOwnProperty.call(aliases,s)?aliases[s]:s;
}
function unique(values: readonly string[]) {
  const map = new Map<string, string>();
  for (const v of values)
    if (!map.has(normalizeBrand(v))) map.set(normalizeBrand(v), v);
  return [...map.values()].sort((a, b) => a.localeCompare(b, "tr-TR"));
}
const SPECIFIC_BRANDS: Record<string, string[]> = {
  "Kule vinç": list(
    "Liebherr|Potain|Comansa|Wolffkran|Raimondi|Jaso|Saez|Terex|Comedil|Peiner|FM Gru|Vicario|Arcomet|SANY|Zoomlion|XCMG|Yongmao|Yongli|Dahan|Fushun",
  ),
  "Hiab / araç üstü vinç": list(
    "Hiab|Palfinger|Fassi|Effer|HMF|PM|Copma|Amco Veba|Cormach|Furukawa|UNIC|Soosan|Hidrokon|Erkin|Furkan|SANY|XCMG|Zoomlion",
  ),
  "Paletli vinç": list(
    "Liebherr|Manitowoc|Tadano|Demag|Terex|Kobelco|Hitachi Sumitomo|Link-Belt|SANY|XCMG|Zoomlion|Sennebogen|Maeda|UNIC|Jekko|Hoeflon",
  ),
  "Mobil vinç": list(
    "Liebherr|Tadano|Grove|Demag|Terex|Kato|Link-Belt|SANY|XCMG|Zoomlion|Sennebogen|Broderson|Shuttlelift|Galion|Locatelli|Marchetti|Ormig|JMG|Valla|Spierings|ACE|Escorts|TIL",
  ),
  Jeneratör: list(
    "Caterpillar|Cummins|Perkins|Volvo Penta|John Deere|MTU|Deutz|Doosan|Hyundai|Kohler|Rehlko|SDMO|FG Wilson|Pramac|Generac|Himoinsa|Aksa|Teksan|Genpower|Alimar|EMSA|Güçbir|Honda|Yamaha|Yanmar|Kubota|Denyo|Atlas Copco",
  ),
  Kompresör: list(
    "Atlas Copco|Kaeser|Ingersoll Rand|Sullair|CompAir|Gardner Denver|Boge|ELGi|Chicago Pneumatic|ABAC|Fini|Mattei|Rotair|Doosan Portable Power|Airman|Denyo|Fusheng|Hitachi|Kobelco|Dalgakıran",
  ),
  "Motopomp / su pompası": list(
    "BBA Pumps|Godwin|Xylem|Flygt|Tsurumi|Koshin|Grindex|Grundfos|Wilo|Gorman-Rupp|Varisco|Ebara|Caprari|Lowara|Pedrollo|Honda|Yamaha|Yanmar|Atlas Copco|Wacker Neuson",
  ),
  "Kaynak makinesi": list(
    "Fronius|Lincoln Electric|Miller|ESAB|Kemppi|EWM|Fimer|Telwin|Gedik|Magmaweld|Askaynak|Honda|Denyo|Shindaiwa",
  ),
  "Endüstriyel temizlik makinesi": list(
    "Kärcher|Nilfisk|Tennant|Hako|Fimap|Comac|IPC|Taski|Kränzle|Lavor|Dulevo|RPS|Bucher",
  ),
  "Işık kulesi": list(
    "Atlas Copco|Generac Mobile|Trime|Wacker Neuson|Pramac|Himoinsa|Allmand|Terex|Sullair|Doosan Portable Power|JCB|Chicago Pneumatic",
  ),
  "Tünel açma makinesi (TBM)": list(
    "Herrenknecht|Robbins|Terratec|Kawasaki|IHI|Komatsu|Hitachi Zosen|CREG|CRCHI|CRCC|XCMG",
  ),
  "Delici jumbo": list(
    "Sandvik|Epiroc|Atlas Copco|Tamrock|Resemin|Mine Master|Furukawa|GHH|Normet",
  ),
  "Fore kazık makinesi": list(
    "Bauer|Soilmec|Casagrande|Liebherr|Junttan|MAIT|IMT|Tescar|Comacchio|Fraste|Geax|Delmag|ABI|Banut|Llamada|FUNDEX|Enteco|SANY|XCMG|Zoomlion|Sunward",
  ),
  "Beton santrali": list(
    "Elkon|MEKA|CONSTMACH|Fabo|Pi Makina|Semix|Güriş|Liebherr|Schwing|Stetter|SANY|Zoomlion|XCMG|Simem|Cemco|Frumecar|Oru|Ocmer|Euromecc|Rapid|İmer",
  ),
  "Beton pompası": list(
    "Putzmeister|Schwing|Cifa|Sermac|SANY|Zoomlion|XCMG|JunJin|KCP|Everdigm|Concord|Alliance|Reed|Mayco|Blastcrete|Mecbo|Dawin|Betonstar|Liebherr",
  ),
  "Sabit beton pompası": list(
    "Putzmeister|Schwing|Cifa|Sermac|SANY|Zoomlion|XCMG|JunJin|KCP|Everdigm|Concord|Alliance|Reed|Mayco|Blastcrete|Mecbo|Betonstar",
  ),
  Biçerdöver: list(
    "John Deere|New Holland|Case IH|Claas|Deutz-Fahr|Fendt|Massey Ferguson|Rostselmash|Sampo Rosenlew|Gleaner|Laverda|Bizon|Fortschritt|Lovol|Zoomlion|Yanmar|Kubota|Iseki|Mitsubishi",
  ),
  "Lastik ve jant": list(
    "Michelin|Bridgestone|Goodyear|Continental|Pirelli|BKT|Alliance|Trelleborg|Mitas|Nokian Tyres|Yokohama|Toyo|Hankook|Kumho|Maxam|Triangle|Linglong|Double Coin|Westlake|Advance|Aeolus|Petlas|Özka|Starmaxx|Lassa|Seha|CEAT|Apollo|JK Tyre|MRF|Titan|Firestone|Camso|Solideal|Galaxy|Carlisle|Armour|Techking|Nankang|Kenda|Roadstone|Nexen|Otani|Sailun|Deestone|Jantsa|Maxion|Accuride|Alcoa|Titan Wheels|GKN Wheels",
  ),
};

export const ALL_BRANDS = unique([...Object.values(BRANDS).flat(),...Object.values(SPECIFIC_BRANDS).flat()]);
export function brandsForCategory(selection: string): string[] {
  if (
    !selection ||
    selection === "Tümü" ||
    selection === "Diğer" ||
    selection === "Diğer iş makinesi"
  )
    return ALL_BRANDS;
  if (Object.prototype.hasOwnProperty.call(SPECIFIC_BRANDS,selection)) return unique(SPECIFIC_BRANDS[selection]);
  const cats = categoryValues(selection);
  const groups = CATEGORY_GROUPS.filter((g) =>
    g.categories.some((c) => cats.includes(c)),
  );
  return unique(groups.flatMap((g) => BRANDS[g.id] ?? []));
}
export function brandMatches(
  actual: string | undefined,
  filter: string | undefined,
) {
  return (
    !filter ||
    filter === "Tümü" ||
    normalizeBrand(actual ?? "") === normalizeBrand(filter)
  );
}

export function canonicalBrand(value: string) {
  const key = normalizeBrand(value);
  return ALL_BRANDS.find((b) => normalizeBrand(b) === key) ?? value.trim();
}

