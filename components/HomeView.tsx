"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { CATEGORIES, CITIES } from "@/lib/data/constants";
import {
  HOME_TABS,
  homeSearchUrl,
  locationUrl,
  type HomeTab,
} from "@/lib/homeSearch";
import {
  dateLabel,
  money,
  POST_KINDS,
  rentalModeLabel,
  PROVIDER_KINDS,
  type MarketPost,
  type Provider,
} from "@/lib/network";
import { getSupabase } from "@/lib/supabase/client";
import { recency } from "@/lib/listing";
import { ListingCard } from "./ListingCard";
import { useMarket } from "./MarketProvider";

function Icon({
  type,
}: {
  type: "search" | "pin" | "arrow" | "machine" | "work" | "part" | "company";
}) {
  const paths = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    machine: (
      <>
        <path d="M3 15h12v5H3zM7 15V8h7v7m0-7 4-4 3 7-3 2M5 20v1m8-1v1" />
        <path d="M8 8V5h5" />
      </>
    ),
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V3h8v4M3 12h18m-11 0v3h4v-3" />
      </>
    ),
    part: (
      <>
        <path d="m10 2 4 0 1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    company: (
      <>
        <path d="M3 21V7h10v14M13 12h8v9M6 10h4m-4 4h4m-4 4h4m6-3h2m-2 3h2M1 21h22" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}
type Feed = {
  jobs: MarketPost[];
  rentals: MarketPost[];
  firms: Provider[];
  errors: string[];
};
export function HomeView() {
  const { listings, profile, authReady, ready } = useMarket();
  const [tab, setTab] = useState<HomeTab>("sale"),
    [q, setQ] = useState(""),
    [city, setCity] = useState(""),
    [cityReady, setCityReady] = useState(false);
  const selectedCity = useRef(false);
  const [feed, setFeed] = useState<Feed>({
      jobs: [],
      rentals: [],
      firms: [],
      errors: [],
    }),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const [counts, setCounts] = useState<{
    offers: number;
    works: number;
  } | null>(null);
  useEffect(() => {
    if (!selectedCity.current) {
      try {
        const saved = localStorage.getItem("makinasal.home.city");
        if (
          saved !== null &&
          (saved === "" || (CITIES as readonly string[]).includes(saved))
        ) {
          setCity(saved);
          selectedCity.current = true;
        } else if (
          profile?.city &&
          (CITIES as readonly string[]).includes(profile.city)
        ) {
          setCity(profile.city);
        }
      } catch {
        if (profile?.city) setCity(profile.city);
      }
    }
    setCityReady(true);
  }, [profile?.city]);
  function chooseCity(value: string) {
    setCity(value);
    selectedCity.current = true;
    try {
      localStorage.setItem("makinasal.home.city", value);
    } catch {
      /* choice remains available for this visit */
    }
  }
  useEffect(() => {
    if (!cityReady) return;
    let active = true;
    setLoading(true);
    const db = getSupabase();
    if (!db) {
      setFeed({
        jobs: [],
        rentals: [],
        firms: [],
        errors: ["İş ağı bağlantısı kullanılamıyor."],
      });
      setLoading(false);
      return;
    }
    let jobs = db
      .from("market_posts")
      .select("*")
      .eq("kind", "job")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(4);
    let rentals = db
      .from("market_posts")
      .select("*")
      .eq("kind", "rental_machine")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(4);
    let firms = db
      .from("service_providers")
      .select("*")
      .eq("published", true)
      .or("company_category.not.is.null,kind.neq.operator")
      .order("created_at", { ascending: false })
      .limit(4);
    if (city) {
      jobs = jobs.eq("city", city);
      rentals = rentals.eq("city", city);
      firms = firms.contains("service_cities", [city]);
    }
    void Promise.all([jobs, rentals, firms])
      .then(([j, r, f]) => {
        if (!active) return;
        setFeed({
          jobs: (j.data ?? []) as MarketPost[],
          rentals: (r.data ?? []) as MarketPost[],
          firms: (f.data ?? []) as Provider[],
          errors: [
            ...(j.error ? ["İş fırsatları yüklenemedi."] : []),
            ...(r.error ? ["Kiralık makineler yüklenemedi."] : []),
            ...(f.error ? ["Firmalar yüklenemedi."] : []),
          ],
        });
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setFeed({
            jobs: [],
            rentals: [],
            firms: [],
            errors: ["İş ağı içerikleri yüklenemedi."],
          });
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [city, cityReady, refresh]);
  useEffect(() => {
    setCounts(null);
    if (!profile) return;
    let active = true;
    const db = getSupabase();
    if (!db) return;
    void Promise.all([
      db
        .from("market_quotes")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", profile.id)
        .eq("status", "pending"),
      db
        .from("market_posts")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", profile.id)
        .eq("status", "open"),
    ]).then(([a, b]) => {
      if (active && !a.error && !b.error)
        setCounts({ offers: a.count ?? 0, works: b.count ?? 0 });
    });
    return () => {
      active = false;
    };
  }, [profile?.id, refresh]);
  const fresh = listings
    .filter((l) => !city || l.city === city)
    .sort((a, b) => recency(b) - recency(a))
    .slice(0, 4);
  const activeTab = HOME_TABS.find((t) => t.id === tab)!;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    window.location.assign(homeSearchUrl(tab, q, city));
  };
  return (
    <div className="home-market">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-top">
          <span className="home-kicker">
            <span /> SAHANIN DİJİTAL İŞ AĞI
          </span>
          <a href="/sirketler">
            Şirketleri keşfet <Icon type="arrow" />
          </a>
        </div>
        <div className="home-hero-copy">
          <h1 id="home-title">
            Doğru makine.
            <br />
            <mark>Doğru ekip. Daha çok iş.</mark>
          </h1>
          <p>
            Al, sat, kirala. İşini paylaş, fiyat al.
            <br />
            Hafriyatçıdan parçacıya, ihtiyacın olan bağlantıyı burada bul.
          </p>
        </div>
        <div className="home-search-box">
          <div
            className="home-search-tabs"
            role="tablist"
            aria-label="Arama kategorisi"
          >
            {HOME_TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`home-tab-${t.id}`}
                aria-controls="home-search-panel"
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => {
                  let target = i;
                  if (e.key === "ArrowRight")
                    target = (i + 1) % HOME_TABS.length;
                  else if (e.key === "ArrowLeft")
                    target = (i - 1 + HOME_TABS.length) % HOME_TABS.length;
                  else if (e.key === "Home") target = 0;
                  else if (e.key === "End") target = HOME_TABS.length - 1;
                  else return;
                  e.preventDefault();
                  setTab(HOME_TABS[target].id);
                  document
                    .getElementById(`home-tab-${HOME_TABS[target].id}`)
                    ?.focus();
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div
            id="home-search-panel"
            role="tabpanel"
            aria-labelledby={`home-tab-${tab}`}
          >
            <form
              className="home-search"
              role="search"
              action={activeTab.route}
              method="get"
              onSubmit={submit}
            >
              <label className="home-search-query">
                <Icon type="search" />
                <span className="sr">{activeTab.label} ara</span>
                <input
                  name="q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  maxLength={200}
                  placeholder={activeTab.placeholder}
                />
              </label>
              <label className="home-search-city">
                <Icon type="pin" />
                <span className="sr">Arama ve ana sayfa için il seç</span>
                <select
                  name="city"
                  value={city}
                  onChange={(e) => chooseCity(e.target.value)}
                >
                  <option value="">Tüm Türkiye</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {tab === "parts" && (
                <input type="hidden" name="cat" value="Yedek parça" />
              )}
              <button className="btn" type="submit">
                Ara <Icon type="arrow" />
              </button>
            </form>
          </div>
        </div>
        <div className="home-popular">
          <span>Hızlı keşfet</span>
          <a href={locationUrl("/kiralik", city)}>Kiralık makineler</a>
          <a href={`/kiralik?bolum=personel${city ? "&city=" + encodeURIComponent(city) : ""}`}>Operatör ve ustalar</a>
          <a href="/parca-talepleri">Parça talepleri</a>
        </div>
      </section>
      <section className="home-intents" aria-label="Hızlı işlemler">
        {[
          {
            href: "/ilan-ver",
            icon: "machine" as const,
            title: "İlan ver",
            text: "Makineni veya parçanı satışa çıkar.",
          },
          {
            href: "/is-agi/yeni?kind=job",
            icon: "company" as const,
            title: "İşimi yaptırmak istiyorum",
            text: "İşini anlat, gelen teklifleri karşılaştır.",
          },
          {
            href: locationUrl("/isler", city),
            icon: "work" as const,
            title: "İş arıyorum",
            text: "Bölgendeki açık işleri keşfet.",
          },
          {
            href: "/is-agi/yeni?kind=part_request",
            icon: "part" as const,
            title: "Parça arıyorum",
            text: "İhtiyacını yaz, elinde olan fiyat versin.",
          },
        ].map((a) => (
          <a href={a.href} key={a.title}>
            <span className="home-intent-icon">
              <Icon type={a.icon} />
            </span>
            <div>
              <h2>{a.title}</h2>
              <p>{a.text}</p>
            </div>
            <span className="home-intent-arrow">↗</span>
          </a>
        ))}
      </section>
      {authReady && profile ? (
        <section className="home-account" aria-label="Hesabın">
          <div>
            <span className="home-small-label">İŞ MERKEZİN</span>
            <h2>
              Merhaba, {profile.full_name?.split(" ")[0] || "tekrar hoş geldin"}
              .
            </h2>
          </div>
          <div>
            <a href="/is-agi/hesabim">
              Gelen teklifler {counts && <b>{counts.offers}</b>}
            </a>
            <a href="/is-agi/hesabim">
              Açık işlerim {counts && <b>{counts.works}</b>}
            </a>
            <a href="/ilanlarim">İlanlarım</a>
            <a href="/envanterim">
              Şirketim ve envanterim <span>↗</span>
            </a>
          </div>
        </section>
      ) : (
        <section className="home-account home-join">
          <div>
            <h2>İşin için yeni bağlantılar kur.</h2>
            <p>
              Ücretsiz hesap aç; ilanlarını, taleplerini ve tekliflerini tek
              yerden yönet.
            </p>
          </div>
          <a className="btn ghost" href="/giris">
            Giriş yap / Kayıt ol →
          </a>
        </section>
      )}
      <div className="home-region">
        <div>
          <Icon type="pin" />
          <span>
            <b>{city || "Tüm Türkiye"}</b>
            <small>
              {city
                ? "Seçtiğin ildeki işler, makineler ve bu ile hizmet veren şirketler"
                : "Şehir seçerek çevrendeki fırsatları keşfet"}
            </small>
          </span>
        </div>
        <label>
          <span className="sr">İçeriklerin şehri</span>
          <select value={city} onChange={(e) => chooseCity(e.target.value)}>
            <option value="">Tüm Türkiye</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {feed.errors.length > 0 && (
        <div className="home-load-error" role="alert">
          <p>{feed.errors.join(" ")}</p>
          <button
            className="btn ghost sm"
            onClick={() => setRefresh((x) => x + 1)}
          >
            Tekrar dene
          </button>
        </div>
      )}
      <HomeSection
        label="YENİ İŞ FIRSATLARI"
        title="Bir sonraki işin burada olabilir."
        href={locationUrl("/isler", city)}
      >
        <FeedContent
          loading={loading}
          empty={feed.jobs.length === 0}
          unavailable={feed.errors.some(
            (e) => e.includes("İş fırsatları") || e.includes("İş ağı"),
          )}
          message={
            city
              ? `${city} için henüz açık iş talebi yok.`
              : "Henüz açık iş talebi yok."
          }
          action="İlk iş talebini oluştur"
          href="/is-agi/yeni?kind=job"
        >
          <div className="home-feed-grid">
            {feed.jobs.map((p) => (
              <HomePost key={p.id} p={p} />
            ))}
          </div>
        </FeedContent>
      </HomeSection>
      <HomeSection
        label="KİRALIK MAKİNELER"
        title="İşin kadar kirala."
        href={locationUrl("/kiralik", city)}
      >
        <FeedContent
          loading={loading}
          empty={feed.rentals.length === 0}
          unavailable={feed.errors.some(
            (e) => e.includes("Kiralık makineler") || e.includes("İş ağı"),
          )}
          message="Bu bölgede henüz kiralık makine ilanı yok."
          action="Kiralık ilanı ver"
          href="/is-agi/yeni?kind=rental_machine"
        >
          <div className="home-feed-grid">
            {feed.rentals.map((p) => (
              <HomePost key={p.id} p={p} />
            ))}
          </div>
        </FeedContent>
      </HomeSection>
      <HomeSection
        label="SATILIK İLANLAR"
        title="İşine güç katacak makineler."
        href={locationUrl("/ilanlar", city)}
      >
        <FeedContent
          loading={!ready}
          empty={fresh.length === 0}
          message="Seçtiğin bölgede henüz satılık ilan yok."
          action="Satılık ilanı ver"
          href="/ilan-ver"
        >
          <div className="grid">
            {fresh.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        </FeedContent>
        <details className="home-categories">
          <summary>
            Satılık kategorilerine göz at <span>+</span>
          </summary>
          <div>
            {CATEGORIES.map((c) => (
              <a
                href={`/ilanlar?${new URLSearchParams({ cat: c, ...(city ? { city } : {}) })}`}
                key={c}
              >
                {c} <span>↗</span>
              </a>
            ))}
          </div>
        </details>
      </HomeSection>
      <section className="home-company-banner">
        <span className="home-company-icon">
          <Icon type="company" />
        </span>
        <div>
          <span className="home-small-label">ŞİRKETİNİ SAHAYA ÇIKAR</span>
          <h2>Filonu göster. Hizmet bölgelerini seç. İş al.</h2>
          <p>
            Hafriyat şirketin, kamyonların ve makinelerin için tek bir şirket
            vitrini oluştur.
          </p>
        </div>
        <a className="btn" href="/firma-kaydi">
          Şirket profili oluştur →
        </a>
      </section>
      <HomeSection
        label="BÖLGENDEKİ ŞİRKETLER"
        title="İşini bilen bir ekiple çalış."
        href={locationUrl("/sirketler", city)}
      >
        <FeedContent
          loading={loading}
          empty={feed.firms.length === 0}
          unavailable={feed.errors.some(
            (e) => e.includes("Firmalar") || e.includes("İş ağı"),
          )}
          message="Bu bölgeye hizmet veren şirket henüz eklenmedi."
          action="Şirketini ekle"
          href="/firma-kaydi"
        >
          <div className="home-feed-grid">
            {feed.firms.map((p) => (
              <a
                className="home-firm-card"
                href={`/firmalar/${p.user_id}`}
                key={p.user_id}
              >
                <span className="home-firm-avatar">
                  {p.name.slice(0, 2).toLocaleUpperCase("tr-TR")}
                </span>
                <span className="home-small-label">
                  {p.company_category || PROVIDER_KINDS[p.kind]}
                </span>
                <h3>{p.name}</h3>
                <p>
                  <Icon type="pin" />
                  {p.city}
                  {p.district ? ` / ${p.district}` : ""}
                </p>
                <div className="home-firm-tags">
                  {p.specialties.slice(0, 2).map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <span className="home-card-footer">
                  Şirketi ve envanterini incele <span>↗</span>
                </span>
              </a>
            ))}
          </div>
        </FeedContent>
      </HomeSection>
      <section className="home-how">
        <div>
          <span className="home-small-label">NASIL ÇALIŞIR?</span>
          <h2>
            İhtiyacından anlaşmaya
            <br />
            üç adım.
          </h2>
          <p>İşin kapsamını ve bedelini karşılıklı netleştir.</p>
        </div>
        <ol>
          <li>
            <b>01</b>
            <div>
              <h3>İhtiyacını paylaş</h3>
              <p>Konumu, tarihleri ve neye ihtiyacın olduğunu belirt.</p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <h3>Teklifleri karşılaştır</h3>
              <p>Fiyatı, kapsamı ve şirket profilini birlikte değerlendir.</p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <h3>Ayrıntıları konuş</h3>
              <p>Özel mesajlarla işi netleştir. Seçim ödeme oluşturmaz.</p>
            </div>
          </li>
        </ol>
      </section>
      <div className="home-trust">
        <span>Konuma göre keşfet</span>
        <span>İki tarafa özel teklifler</span>
        <span>Tek hesapla iş ve ilan yönetimi</span>
        <a href="/guven">Güvenli işlem rehberi ↗</a>
      </div>
    </div>
  );
}
function HomeSection({
  label,
  title,
  href,
  children,
}: {
  label: string;
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section className="home-section">
      <div className="home-section-heading">
        <div>
          <span className="home-small-label">{label}</span>
          <h2>{title}</h2>
        </div>
        <a href={href}>
          Tümünü gör <span>↗</span>
        </a>
      </div>
      {children}
    </section>
  );
}
function FeedContent({
  unavailable = false,
  loading,
  empty,
  message,
  action,
  href,
  children,
}: {
  loading: boolean;
  unavailable?: boolean;
  empty: boolean;
  message: string;
  action: string;
  href: string;
  children: ReactNode;
}) {
  return loading ? (
    <div
      className="home-skeletons"
      role="status"
      aria-label="İçerikler yükleniyor"
    >
      <span />
      <span />
      <span />
      <span />
    </div>
  ) : unavailable ? (
    <div className="home-empty">
      <p>
        Bu bölüm yüklenemedi. Yukarıdaki “Tekrar dene” düğmesiyle yeniden
        deneyebilirsin.
      </p>
    </div>
  ) : empty ? (
    <div className="home-empty">
      <p>{message}</p>
      <a href={href}>{action} →</a>
    </div>
  ) : (
    <>{children}</>
  );
}
function HomePost({ p }: { p: MarketPost }) {
  return (
    <a className="home-post-card" href={`/is-agi/ilan/${p.id}`}>
      <span className={`home-post-type ${p.kind === "job" ? "job" : ""}`}>
        {POST_KINDS[p.kind]}
      </span>
      <h3>{p.title}</h3>
      {p.kind === "rental_machine" && (
        <span className="home-rental-scope">
          {rentalModeLabel(p.rental_mode)}
        </span>
      )}
      <p className="home-card-location">
        <Icon type="pin" />
        {p.city}
        {p.district ? ` / ${p.district}` : ""}
      </p>
      <p className="home-card-description">
        {p.description.slice(0, 110)}
        {p.description.length > 110 ? "…" : ""}
      </p>
      <div className="home-post-meta">
        <span>{p.category}</span>
        <span>
          {p.start_date ? dateLabel(p.start_date) : "Tarih görüşülecek"}
          {p.end_date ? ` – ${dateLabel(p.end_date)}` : ""}
        </span>
      </div>
      <strong>{money(p.price, p.price_unit)}</strong>
      <span className="home-card-footer">
        {p.kind === "job" ? "İşi incele ve teklif ver" : "Kiralama ayrıntıları"}{" "}
        <span>↗</span>
      </span>
    </a>
  );
}
