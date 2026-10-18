"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useId, useMemo, useState } from "react";
import {
  CATEGORY_GROUPS,
  brandsForCategory,
  categoryLabel,
  normalizeBrand,
} from "@/lib/machineryCatalog";
export function CategoryOptions({
  includeParts = true,
  allowGroups = false,
  includeOther = false,
}: {
  includeParts?: boolean;
  allowGroups?: boolean;
  includeOther?: boolean;
}) {
  const { t: tr, language } = useLanguage();

  return (
    <>
      {CATEGORY_GROUPS.filter((g) => includeParts || g.id !== "parts").map(
        (g) => (
          <optgroup key={g.id} label={tr(g.label)}>
            {allowGroups && g.categories.length > 1 && g.id !== "parts" && (
              <option value={`group:${g.id}`}>
                {tr("Tüm ")}{tr(g.label)}
              </option>
            )}
            {g.categories.map((c) => (
              <option key={c} value={c}>
                {tr(c)}
              </option>
            ))}
          </optgroup>
        ),
      )}
      {includeOther && <option value="Diğer">{tr("Diğer")}</option>}
    </>
  );
}
export function CategoryFilterList({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t: tr, language } = useLanguage();

  const [q, setQ] = useState("");
  const query = q.trim().toLocaleLowerCase("tr-TR");
  return (
    <div className="catalog-tree">
      <label className="sr" htmlFor="category-list-search">
        {tr("Makine türü ara")}</label>
      <input
        id="category-list-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tr("Tür ara: ekskavatör, vinç…")}
      />
      <p className="catalog-selected">
        {tr("Seçili: ")}<b>{tr(categoryLabel(value))}</b>
      </p>
      <button
        type="button"
        className="catalog-all"
        aria-pressed={value === "Tümü"}
        onClick={() => onChange("Tümü")}
      >
        {tr("Tüm makine ve parçalar")}</button>
      <div className="catalog-tree-scroll">
        {CATEGORY_GROUPS.map((g) => {
          const cats = (g.label.toLocaleLowerCase("tr-TR").includes(query) || tr(g.label).toLowerCase().includes(query))
            ? [...g.categories]
            : g.categories.filter((c) =>
                (c.toLocaleLowerCase("tr-TR").includes(query) || tr(c).toLowerCase().includes(query)),
              );
          if (!cats.length) return null;
          const selected =
            g.categories.some((c) => c === value) || value === "group:" + g.id;
          return g.categories.length === 1 ? (
            <button
              type="button"
              className="catalog-single"
              key={g.id}
              aria-pressed={selected}
              onClick={() => onChange(g.categories[0])}
            >
              {tr(g.label)}
            </button>
          ) : (
            <details
              key={g.id + (query ? "search" : "")}
              open={query ? true : undefined}
              className={selected ? "has-selection" : ""}
            >
              <summary>
                {tr(g.label)}
                <span>{g.categories.length}</span>
              </summary>
              <ul>
                {g.id !== "parts" && (
                  <li>
                    <button
                      type="button"
                      aria-pressed={value === "group:" + g.id}
                      onClick={() => onChange("group:" + g.id)}
                    >
                      {tr("Tümünü göster")}</button>
                  </li>
                )}
                {cats.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      aria-pressed={value === c}
                      onClick={() => onChange(c)}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
export function BrandField({
  category,
  value,
  onChange,
  defaultValue = "",
  name,
  id,
  label = "Marka",
  required = false,
  observed = [],
}: {
  category: string;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  name?: string;
  id?: string;
  label?: string;
  required?: boolean;
  observed?: string[];
}) {
  const { t: tr, language } = useLanguage();

  const uid = useId();
  const inputId = id ?? `brand-${uid}`;
  const [local, setLocal] = useState(defaultValue),
    [q, setQ] = useState("");
  const current = value ?? local;
  const set = (v: string) => {
    setLocal(v);
    onChange?.(v);
  };
  const brands = useMemo(() => {
    const map = new Map<string, string>();
    for (const brand of [...brandsForCategory(category), ...observed])
      if (brand.trim() && !map.has(normalizeBrand(brand)))
        map.set(normalizeBrand(brand), brand);
    return [...map.values()].sort((a, b) => a.localeCompare(b, "tr-TR"));
  }, [category, observed]);
  const shown = brands.filter((b) =>
    normalizeBrand(b).includes(normalizeBrand(q)),
  );
  return (
    <div className="catalog-brand">
      <label htmlFor={inputId}>{tr(label)}</label>
      <input
        id={inputId}
        type="text"
        name={name}
        list={`${inputId}-options`}
        value={current}
        onChange={(e) => set(e.target.value)}
        maxLength={100}
        required={required}
        placeholder={tr("Marka seç veya yaz")}
        autoComplete="off"
      />
      <datalist id={`${inputId}-options`}>
        {brands.map((b) => (
          <option value={b} key={b} />
        ))}
      </datalist>
      <details>
        <summary>{brands.length} {tr(" marka önerisini listele")}</summary>
        <label className="sr" htmlFor={`${inputId}-find`}>
          {tr("Marka listesinde ara")}</label>
        <input
          id={`${inputId}-find`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Marka adını bul…")}
        />
        <ul>
          {shown.map((b) => (
            <li key={b}>
              <button
                type="button"
                aria-pressed={normalizeBrand(current) === normalizeBrand(b)}
                onClick={(e) => {
                  set(b);
                  const el = e.currentTarget.closest("details");
                  if (el) el.open = false;
                }}
              >
                {b}
              </button>
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <p className="sub">
            {tr("Listede yok. Markayı üstteki alana yazabilirsin.")}</p>
        )}
      </details>
      <small>
        {tr("Listede olmayan markayı yazabilirsin. Öneriler güncel ve eski marka adlarını içerir.")}</small>
    </div>
  );
}
