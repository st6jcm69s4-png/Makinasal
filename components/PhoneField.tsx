"use client";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { countryList } from "@/lib/countries";

/** Bayraklı ülke kodu seçici + numara. onChange her zaman "+kod numara" biçiminde (boşsa "") döner. */
export function PhoneField({ id, onChange, required = true }: { id: string; onChange: (value: string) => void; required?: boolean }) {
  const { t: tr, language } = useLanguage();
  const countries = useMemo(() => countryList(language === "de" ? "de" : language === "en" ? "en" : "tr"), [language]);
  const [dial, setDial] = useState("90");
  const [national, setNational] = useState("");
  const emit = (d: string, n: string) => {
    const raw = n.trim();
    if (!raw) return onChange("");
    if (raw.startsWith("+")) return onChange(raw);
    onChange("+" + d + raw.replace(/[^0-9]/g, "").replace(/^0+/, ""));
  };
  return <div className="phone-field">
    <select aria-label={tr("Ülke kodu")} value={dial} onChange={e => { setDial(e.target.value); emit(e.target.value, national); }}>
      {countries.map(c => <option key={c.iso} value={c.dial}>{c.flag} {c.name} +{c.dial}</option>)}
    </select>
    <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" required={required} value={national} maxLength={20}
      placeholder={dial === "90" ? "5XX XXX XX XX" : tr("Numara")} onChange={e => { setNational(e.target.value); emit(dial, e.target.value); }} />
  </div>;
}
