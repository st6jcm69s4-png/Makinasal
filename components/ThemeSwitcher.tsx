"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

export type ThemeChoice = "system" | "light" | "dark";
export const THEME_KEY = "makinasal-theme";

function apply(choice: ThemeChoice) {
  const el = document.documentElement;
  if (choice === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", choice);
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#202024" : "#25272D");
}

export function ThemeSwitcher() {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark") setChoice(v);
    } catch {}
  }, []);
  function pick(next: ThemeChoice) {
    setChoice(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {}
  }
  const items: [ThemeChoice, string][] = [["system", "Sistem"], ["light", "Açık tema"], ["dark", "Koyu tema"]];
  return (
    <div className="theme-switch" role="group" aria-label={t("Görünüm")}>
      {items.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={choice === v} onClick={() => pick(v)}>{t(label)}</button>
      ))}
    </div>
  );
}
