"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useId } from "react";
import { CITIES } from "@/lib/data/constants";
import { COUNTRY, districtsFor } from "@/lib/profile";
export function RegionFields({ city, district, onChange, required = false }: { city: string; district: string; required?: boolean; onChange: (region: { city: string; district: string }) => void }) {
  const { t: tr, language } = useLanguage();

  const id = useId();
  return <div className="region-fields">
    <div className="field"><label htmlFor={`${id}-country`}>{tr("Ülke")}</label><input id={`${id}-country`} type="text" value={COUNTRY} readOnly autoComplete="country-name" /></div>
    <div className="region-grid">
      <div className="field"><label htmlFor={`${id}-city`}>{required ? tr("İl") : tr("İl (isteğe bağlı)")}</label><select id={`${id}-city`} name="city" required={required} value={city} autoComplete="address-level1" onChange={e => onChange({ city: e.target.value, district: "" })}><option value="">{tr("İl seç")}</option>{CITIES.map(c => <option key={c} value={c}>{tr(c)}</option>)}</select></div>
      <div className="field"><label htmlFor={`${id}-district`}>{required ? tr("İlçe") : tr("İlçe (isteğe bağlı)")}</label><select id={`${id}-district`} name="district" required={required} value={district} disabled={!city} autoComplete="address-level2" onChange={e => onChange({ city, district: e.target.value })}><option value="">{tr(city ? tr("İlçe seç") : tr("Önce il seç"))}</option>{district && !districtsFor(city).includes(district) && <option value={district}>{district} {tr(" (önceki kayıt)")}</option>}{districtsFor(city).map(d => <option key={d} value={d}>{tr(d)}</option>)}</select></div>
    </div>
  </div>;
}
