import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LEGAL, LEGAL_SLUGS, LEGAL_UPDATED, type LegalSlug } from '@/lib/legal';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return LEGAL_SLUGS.map((slug) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL[slug as LegalSlug];
  return doc ? { title: `${doc.title} | Makinasal` } : {};
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;
  const doc = LEGAL[slug as LegalSlug];
  if (!doc) notFound();
  return (
    <article className="card" style={{ padding: 20, maxWidth: 820 }}>
      <h1>{doc.title}</h1>
      <p className="sub">Son güncelleme: {LEGAL_UPDATED} · Taslak metindir; yayına almadan önce hukuki danışmanlıkla onaylanmalıdır.</p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((t) => <p key={t}>{t}</p>)}
        </section>
      ))}
      <nav className="acts-row" aria-label="Hukuki metinler">
        {LEGAL_SLUGS.map((k) => <a key={k} href={`/hukuki/${k}`}>{LEGAL[k].title}</a>)}
      </nav>
    </article>
  );
}
