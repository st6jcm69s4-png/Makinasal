import { PASSWORD_RULES } from "@/lib/accountSecurity";
export function PasswordRules({ value }: { value: string }) { return <ul className="password-rules" aria-label="Şifre koşulları">{PASSWORD_RULES.map(rule => <li key={rule.label} className={rule.test(value) ? "met" : ""}><span aria-hidden="true">{rule.test(value) ? "✓" : "○"}</span>{rule.label}</li>)}</ul>; }
