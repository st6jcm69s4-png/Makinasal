"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { PASSWORD_RULES } from "@/lib/accountSecurity";
export function PasswordRules({ value }: { value: string }) {
  const { t: tr, language } = useLanguage();
 return <ul className="password-rules" aria-label={tr("Şifre koşulları")}>{PASSWORD_RULES.map(rule => <li key={rule.label} className={rule.test(value) ? "met" : ""}><span aria-hidden="true">{rule.test(value) ? "✓" : "○"}</span>{tr(rule.label)}</li>)}</ul>; }
