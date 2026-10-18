'use client';
import { useLanguage } from "@/components/LanguageProvider";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();

  return <div className="panel" role="alert"><h1>{t("Sayfa yüklenemedi")}</h1><p>{t("Beklenmeyen bir sorun oluştu. Lütfen tekrar dene.")}</p><div className="acts-row"><button className="btn" onClick={reset}>{t("Tekrar dene")}</button><a className="btn ghost" href="/ilanlar">{t("İlanlara dön")}</a></div></div>;
}
