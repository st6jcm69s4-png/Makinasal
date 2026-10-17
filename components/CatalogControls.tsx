"use client";
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
  return (
    <>
      {CATEGORY_GROUPS.filter((g) => includeParts || g.id !== "parts").map(
        (g) => (
          <optgroup key={g.id} label={g.label}>
            {allowGroups && g.categories.length > 1 && g.id !== "parts" && (
              <option value={`group:${g.id}`}>
                Tüm {g.label.toLocaleLowerCase("tr-TR")}
              </option>
            )}
            {g.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </optgroup>
        ),
      )}
      {includeOther && <option value="Diğer">Diğer</option>}
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
  const [q, setQ] = useState("");
  const query = q.trim().toLocaleLowerCase("tr-TR");
  return (
    <div className="catalog-tree">
      <label className="sr" htmlFor="category-list-search">
        Makine türü ara
      </label>
      <input
        id="category-list-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tür ara: ekskavatör, vinç…"
      />
      <p className="catalog-selected">
        Seçili: <b>{categoryLabel(value)}</b>
      </p>
      <button
        type="button"
        className="catalog-all"
        aria-pressed={value === "Tümü"}
        onClick={() => onChange("Tümü")}
      >
        Tüm makine ve parçalar
      </button>
      <div className="catalog-tree-scroll">
        {CATEGORY_GROUPS.map((g) => {
          const cats = g.label.toLocaleLowerCase("tr-TR").includes(query)
            ? [...g.categories]
            : g.categories.filter((c) =>
                c.toLocaleLowerCase("tr-TR").includes(query),
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
              {g.label}
            </button>
          ) : (
            <details
              key={g.id + (query ? "search" : "")}
              open={query ? true : undefined}
              className={selected ? "has-selection" : ""}
            >
              <summary>
                {g.label}
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
                      Tümünü göster
                    </button>
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
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        name={name}
        list={`${inputId}-options`}
        value={current}
        onChange={(e) => set(e.target.value)}
        maxLength={100}
        required={required}
        placeholder="Marka seç veya yaz"
        autoComplete="off"
      />
      <datalist id={`${inputId}-options`}>
        {brands.map((b) => (
          <option value={b} key={b} />
        ))}
      </datalist>
      <details>
        <summary>{brands.length} marka önerisini listele</summary>
        <label className="sr" htmlFor={`${inputId}-find`}>
          Marka listesinde ara
        </label>
        <input
          id={`${inputId}-find`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Marka adını bul…"
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
            Listede yok. Markayı üstteki alana yazabilirsin.
          </p>
        )}
      </details>
      <small>
        Listede olmayan markayı yazabilirsin. Öneriler güncel ve eski marka
        adlarını içerir.
      </small>
    </div>
  );
}
