"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import {
  CITIES,
  MACHINE_CATEGORIES,
  PART_CATEGORIES,
} from "@/lib/data/constants";
import {
  RENTAL_MODES,
  PERSONNEL_ROLES,
  rentalModeLabel,
  COMPANY_CATEGORIES,
  ACTIVITIES,
  POST_KINDS,
  PROVIDER_KINDS,
  QUOTE_STATUS,
  UNITS,
  dateLabel,
  money,
  networkError,
  validKind,
  validCoordinates,
  type MarketPost,
  type PostKind,
  type Provider,
  type Quote,
} from "@/lib/network";
import { useMarket } from "./MarketProvider";
import { CompanyInventory } from "./CompanyInventory";
import { CategoryOptions, BrandField } from "./CatalogControls";
import { categoryValues, canonicalBrand } from "@/lib/machineryCatalog";

type Client = NonNullable<ReturnType<typeof getSupabase>>;
const client = () => getSupabase();
function ErrorBox({ error }: { error: string }) {
  return error ? (
    <p className="network-error" role="alert">
      {error}
    </p>
  ) : null;
}
function Login({ children }: { children: ReactNode }) {
  const { profile, authReady } = useMarket();
  return !authReady ? (
    <p role="status">Hesabın yükleniyor…</p>
  ) : !profile ? (
    <div className="panel">
      <h2>Hesabınla devam et</h2>
      <p>İlan açmak, teklif vermek ve mesajlaşmak için giriş yap.</p>
      <a className="btn" href="/giris">
        Giriş yap / Kayıt ol
      </a>
    </div>
  ) : (
    <>{children}</>
  );
}
function Place({
  item,
}: {
  item: {
    city: string;
    district: string;
    lat: number | null;
    lng: number | null;
  };
}) {
  return (
    <span>
      {item.city}
      {item.district ? ` / ${item.district}` : ""}
      {item.lat != null && item.lng != null ? (
        <>
          {" "}
          ·{" "}
          <a
            className="linkbtn"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lng}#map=14/${item.lat}/${item.lng}`}
          >
            Haritada gör ↗
          </a>
        </>
      ) : null}
    </span>
  );
}
function LocationFields({
  city = "",
  district = "",
  lat = null,
  lng = null,
}: {
  city?: string;
  district?: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const [pos, setPos] = useState({
    lat: lat === null ? "" : String(lat),
    lng: lng === null ? "" : String(lng),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <label>
        İl
        <select name="city" required defaultValue={city}>
          <option value="">İl seç</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        İlçe / çalışma bölgesi
        <input
          name="district"
          maxLength={120}
          defaultValue={district}
          placeholder="Örn. Sincan, OSB"
          required
        />
      </label>
      <div className="network-location">
        <p className="sub">
          İl ve ilçe herkese görünür. İstersen harita konumu ekle; eklediğin
          koordinatlar da ilanında herkese açık yayımlanır.
        </p>
        <button
          className="btn ghost sm"
          type="button"
          disabled={busy}
          onClick={() => {
            setError("");
            if (!navigator.geolocation) {
              setError("Tarayıcın konumu desteklemiyor.");
              return;
            }
            setBusy(true);
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setPos({
                  lat: p.coords.latitude.toFixed(5),
                  lng: p.coords.longitude.toFixed(5),
                });
                setBusy(false);
              },
              () => {
                setError(
                  "Konum alınamadı. Konum iznini kontrol et veya il ve ilçeyle devam et.",
                );
                setBusy(false);
              },
              { timeout: 10000, maximumAge: 60000 },
            );
          }}
        >
          {busy ? "Konum alınıyor…" : "Mevcut konumumu ekle"}
        </button>
        {pos.lat && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setPos({ lat: "", lng: "" })}
          >
            Harita konumunu kaldır
          </button>
        )}
        <div className="network-form-grid">
          <label>
            Enlem (isteğe bağlı)
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              name="lat"
              value={pos.lat}
              onChange={(e) => setPos({ ...pos, lat: e.target.value })}
              placeholder="39.92"
            />
          </label>
          <label>
            Boylam (isteğe bağlı)
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              name="lng"
              value={pos.lng}
              onChange={(e) => setPos({ ...pos, lng: e.target.value })}
              placeholder="32.85"
            />
          </label>
        </div>
        <ErrorBox error={error} />
      </div>
    </>
  );
}
function locationData(f: FormData) {
  const lat = String(f.get("lat") || ""),
    lng = String(f.get("lng") || "");
  if (Boolean(lat) !== Boolean(lng))
    throw new Error("Harita konumu için enlem ve boylamı birlikte gir.");
  const data = {
    city: String(f.get("city")),
    district: String(f.get("district") || "").trim(),
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
  };
  if (!validCoordinates(data.lat, data.lng))
    throw new Error("Harita koordinatları geçersiz.");
  return data;
}
export function NetworkNav() {
  return (
    <nav className="network-nav" aria-label="İş ağı">
      <a href="/is-agi">Tüm iş ağı</a>
      <a href="/kiralik">Kiralık</a>
      <a href="/isler">İş talepleri</a>
      <a href="/parca-talepleri">Parça talepleri</a>
      <a href="/sirketler">Şirketler</a>
      <a href="/firmalar">Firma rehberi</a>
      <a href="/is-agi/hesabim">İşlerim ve tekliflerim</a>
    </nav>
  );
}
const PAGE_SIZE = 24;
export function NetworkBrowse({ kind: fixedKind, rentalHub = false }: { kind?: PostKind; rentalHub?: boolean }) {
  const [rentalKind, setRentalKind] = useState<PostKind>("rental_machine");
  const [personnelRole, setPersonnelRole] = useState("");
  const kind = rentalHub ? rentalKind : fixedKind;
  const [posts, setPosts] = useState<MarketPost[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [q, setQ] = useState(""),
    [city, setCity] = useState(""),
    [category, setCategory] = useState(""),
    [brand, setBrand] = useState(""),
    [rentalMode, setRentalMode] = useState(""),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [filtersReady, setFiltersReady] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (rentalHub && params.get("bolum") === "personel") setRentalKind("rental_operator");
    const role = params.get("personnel_role");
    if (role && Object.prototype.hasOwnProperty.call(PERSONNEL_ROLES, role)) setPersonnelRole(role);
    const initialCity = params.get("city");
    if (initialCity && (CITIES as readonly string[]).includes(initialCity))
      setCity(initialCity);
    setQ((params.get("q") || "").slice(0, 200));
    const cat = params.get("cat");
    if (cat && categoryValues(cat).length) setCategory(cat);
    setBrand((params.get("brand") || "").slice(0, 100));
    const mode = params.get("rental_mode");
    if (mode && Object.prototype.hasOwnProperty.call(RENTAL_MODES, mode))
      setRentalMode(mode);
    setFiltersReady(true);
  }, []);
  useEffect(() => {
    if (!filtersReady) return;
    let active = true;
    setBusy(true);
    setError("");
    const db = client();
    if (!db) {
      setError("Veritabanı bağlantısı yapılandırılmadı.");
      setBusy(false);
      return;
    }
    let query = db
      .from("market_posts")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    if (kind) query = query.eq("kind", kind);
    if (rentalMode && kind !== "rental_operator") query = query.eq("rental_mode", rentalMode);
    if (kind === "rental_operator" && personnelRole) query = query.eq("personnel_role", personnelRole);
    if (city) query = query.eq("city", city);
    if (category) query = query.in("category", categoryValues(category));
    if (brand.trim())
      query = query.ilike(
        "brand",
        canonicalBrand(brand).replace(/[%_\\]/g, ""),
      );
    if (q.trim())
      query = query.ilike("title", `%${q.trim().replace(/[%_\\]/g, "")}%`);
    void query.then((r) => {
      if (!active) return;
      if (r.error) setError(networkError(r.error));
      else {
        setPosts((r.data ?? []).slice(0, PAGE_SIZE) as MarketPost[]);
        setMore((r.data ?? []).length > PAGE_SIZE);
      }
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [kind, city, category, q, page, refresh, filtersReady, rentalMode, brand, personnelRole]);
  useEffect(() => {
    if (!rentalHub || !filtersReady) return;
    const params = new URLSearchParams();
    if (kind === "rental_operator") params.set("bolum", "personel");
    if (city) params.set("city", city);
    if (q) params.set("q", q);
    if (category) params.set("cat", category);
    if (brand) params.set("brand", brand);
    if (kind === "rental_machine" && rentalMode) params.set("rental_mode", rentalMode);
    if (kind === "rental_operator" && personnelRole) params.set("personnel_role", personnelRole);
    window.history.replaceState(null, "", `/kiralik${params.size ? "?" + params.toString() : ""}`);
  }, [rentalHub, filtersReady, kind, city, q, category, brand, rentalMode, personnelRole]);
  return (
    <>
      {!rentalHub && <NetworkNav />}
      <div className="network-heading">
        <div>
          <span className="eyebrow">MAKİNASAL İŞ AĞI</span>
          <h1>
            {rentalHub ? "Kiralık" : kind ? POST_KINDS[kind] : "İş bul. Ekibini bul. İşini yaptır."}
          </h1>
          <p className="lead">
            {kind === "part_request"
              ? "Aradığın parçayı yaz; elinde olanlar fiyatıyla teklif versin."
              : kind === "job"
                ? "İşin konumunu, tarihini ve ihtiyacını paylaş; gelen fiyatları karşılaştır."
                : kind === "rental_machine"
                  ? "İşine uygun makine ve kamyonu konumuna göre kirala."
                  : kind === "rental_operator"
                    ? "Makine veya kamyon türüne göre operatör, şoför ve usta bul."
                    : "Kiralık makineler, operatörler, iş fırsatları, parçalar ve yerel firmalar aynı yerde."}
          </p>
        </div>
        <a className="btn" href={`/is-agi/yeni?kind=${kind ?? "job"}`}>
          {kind === "part_request"
            ? "Parça talebi aç"
            : kind === "job"
              ? "İş talebi aç"
              : kind
                ? kind === "rental_operator" ? "Hizmet ilanı ver" : "Kiralık ilanı ver"
                : "İş ağı ilanı ver"}
        </a>
      </div>
      {rentalHub && <section className="rental-categories" aria-label="Kiralama bölümleri">
        <button type="button" className={kind === "rental_machine" ? "selected" : ""} aria-pressed={kind === "rental_machine"} onClick={() => { setRentalKind("rental_machine"); setPage(0); }}>
          <b>Makine ve araç kiralama</b><span>İş makineleri, kamyonlar, vinçler ve tüm ekipmanlar</span>
        </button>
        <button type="button" className={kind === "rental_operator" ? "selected" : ""} aria-pressed={kind === "rental_operator"} onClick={() => { setRentalKind("rental_operator"); setPage(0); }}>
          <b>Operatör ve ustalar</b><span>Makine operatörü, kamyon şoförü ve teknik ustalar</span>
        </button>
      </section>}
      {!kind && (
        <div className="network-portals">
          {Object.entries(POST_KINDS).map(([k, v], i) => (
            <a
              className="panel"
              key={k}
              href={
                ["/kiralik", "/kiralik?bolum=personel", "/isler", "/parca-talepleri"][i]
              }
            >
              <span className="network-number">0{i + 1}</span>
              <h2>{v}</h2>
              <span className="linkbtn">İlanları incele →</span>
            </a>
          ))}
          <a className="panel" href="/firmalar">
            <span className="network-number">05</span>
            <h2>Hafriyat firmaları ve parçacılar</h2>
            <span className="linkbtn">Bölgendeki firmayı bul →</span>
          </a>
          <a className="panel" href="/firma-kaydi">
            <span className="network-number">06</span>
            <h2>Firmanı iş ağına ekle</h2>
            <span className="linkbtn">Hizmet bölgelerini belirle →</span>
          </a>
        </div>
      )}
      {rentalHub && <p className="sub">Önce makine veya araç türünü seç; ardından konum, marka ve hizmet kapsamıyla sonuçları daralt.</p>}
      <div className="network-filters">
        <label>
          Başlıkta ara
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Kamyon, ekskavatör, parça…"
          />
        </label>
        <label>
          Konum
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tüm iller</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {kind === "rental_operator" && <label>Hizmet türü<select value={personnelRole} onChange={e => { setPersonnelRole(e.target.value); setPage(0); }}>
          <option value="">Operatör, şoför ve ustaların tümü</option>
          {Object.entries(PERSONNEL_ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>}
        {(kind === "rental_machine" || !kind) && (
          <label>
            Kiralama kapsamı
            <select
              value={rentalMode}
              onChange={(e) => {
                setRentalMode(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tümü (belirtilmemiş ilanlar dahil)</option>
              {Object.entries(RENTAL_MODES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {rentalHub ? "Makine / araç türü" : "İhtiyaç / makine türü"}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setBrand("");
              setPage(0);
            }}
          >
            <option value="">Tüm türler</option>
            <CategoryOptions includeParts={!rentalHub} includeOther={!rentalHub} allowGroups />
          </select>
        </label>
        <BrandField
          category={category}
          value={brand}
          onChange={(v) => {
            setBrand(v);
            setPage(0);
          }}
          label="Marka filtresi (isteğe bağlı)"
        />
      </div>
      {rentalHub && <div className="acts-row"><button type="button" className="btn ghost" onClick={() => { setQ(""); setCity(""); setCategory(""); setBrand(""); setRentalMode(""); setPersonnelRole(""); setPage(0); }}>Filtreleri temizle</button><span className="sub" role="status">{busy ? "Sonuçlar yükleniyor…" : `${posts.length}${more ? "+" : ""} ilan bu sayfada`}</span></div>}
      <ErrorBox error={error} />
      {error && (
        <button className="btn ghost" onClick={() => setRefresh((x) => x + 1)}>
          Tekrar dene
        </button>
      )}
      {busy ? (
        <p role="status">İlanlar yükleniyor…</p>
      ) : !error && posts.length === 0 ? (
        <div className="panel network-empty">
          <h2>Bu aramada henüz ilan yok</h2>
          <p>Filtreleri değiştir veya ilk ilanı sen aç.</p>
        </div>
      ) : (
        <div className="network-cards">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
      <div className="network-actions">
        <button
          className="btn ghost"
          disabled={page === 0 || busy}
          onClick={() => setPage((p) => p - 1)}
        >
          Önceki
        </button>
        <span>Sayfa {page + 1}</span>
        <button
          className="btn ghost"
          disabled={!more || busy}
          onClick={() => setPage((p) => p + 1)}
        >
          Sonraki
        </button>
      </div>
      <p className="sub">
        Satılık makine ve parçalar için{" "}
        <a className="linkbtn" href="/ilanlar">
          satılık ilanlara git
        </a>
        .
      </p>
    </>
  );
}
function PostCard({ post: p }: { post: MarketPost }) {
  return (
    <article className="panel network-card">
      <div>
        <span className="pill">{POST_KINDS[p.kind]}</span>
        {p.status !== "open" && (
          <span className="pill">
            {p.status === "closed" ? "Kapalı" : "Kaldırıldı"}
          </span>
        )}
      </div>
      {p.kind === "rental_operator" && <span className="pill">{p.personnel_role ? PERSONNEL_ROLES[p.personnel_role] : "Hizmet türü belirtilmedi"}</span>}
      {p.kind === "rental_machine" && (
        <span className="pill">{rentalModeLabel(p.rental_mode)}</span>
      )}
      <h2>
        <a href={`/is-agi/ilan/${p.id}`}>{p.title}</a>
      </h2>
      <p className="sub">
        <Place item={p} />
      </p>
      <p>
        {p.description.slice(0, 160)}
        {p.description.length > 160 ? "…" : ""}
      </p>
      <p className="sub">
        {p.category}
        {p.brand ? ` · ${p.brand} ${p.model || ""}` : ""} · {p.quantity}{" "}
        {p.kind === "rental_operator" ? "kişi" : "adet"}
        {p.start_date
          ? ` · ${dateLabel(p.start_date)}${p.end_date ? ` – ${dateLabel(p.end_date)}` : ""}`
          : ""}
      </p>
      <strong className="network-price">{money(p.price, p.price_unit)}</strong>
      <a className="linkbtn" href={`/is-agi/ilan/${p.id}`}>
        Ayrıntı ve teklifler →
      </a>
    </article>
  );
}

export function PostEditor() {
  return (
    <Login>
      <PostEditorForm />
    </Login>
  );
}
function PostEditorForm() {
  const { profile } = useMarket();
  const [kind, setKind] = useState<PostKind>("job"),
    [post, setPost] = useState<MarketPost | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [requested, setRequested] = useState("");
  const [preferred, setPreferred] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKind(validKind(params.get("kind")));
    setRequested(params.get("firma")?.slice(0, 120) || "");
    const providerId = params.get("provider");
    if (providerId && /^[0-9a-f-]{36}$/i.test(providerId))
      setPreferred(providerId);
    const id = params.get("edit");
    if (!id) {
      setLoading(false);
      return;
    }
    const db = client();
    if (!db) {
      setError("Veritabanı bağlantısı yok.");
      setLoading(false);
      return;
    }
    void db
      .from("market_posts")
      .select("*")
      .eq("id", id)
      .eq("owner_id", profile!.id)
      .maybeSingle()
      .then((r) => {
        if (r.error || !r.data) setError("Düzenlenecek ilan bulunamadı.");
        else {
          setPost(r.data as MarketPost);
          setCategory(r.data.category);
          setKind(r.data.kind);
          setPreferred(r.data.preferred_provider);
        }
        setLoading(false);
      });
  }, [profile]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const db = client();
    if (!db || !profile) return;
    setBusy(true);
    setError("");
    try {
      const data = {
        ...locationData(f),
        kind,
        rental_mode:
          kind === "rental_machine" ? String(f.get("rental_mode") || "") : null,
        personnel_role: kind === "rental_operator" ? String(f.get("personnel_role") || "") : null,
        title: String(f.get("title")).trim(),
        description: String(f.get("description")).trim(),
        category: String(f.get("category")),
        brand: canonicalBrand(String(f.get("brand") || "")),
        model: String(f.get("model") || "").trim(),
        start_date: String(f.get("start_date") || "") || null,
        end_date: String(f.get("end_date") || "") || null,
        price: f.get("price") ? Number(f.get("price")) : null,
        price_unit: String(f.get("price_unit")),
        quantity: Number(f.get("quantity")),
        specs: String(f.get("specs") || "").trim(),
      };
      if (kind === "rental_operator" && !Object.prototype.hasOwnProperty.call(PERSONNEL_ROLES, data.personnel_role ?? "")) throw new Error("Operatör, şoför veya usta hizmet türünü seç.");
      if (
        kind === "rental_machine" &&
        !Object.prototype.hasOwnProperty.call(
          RENTAL_MODES,
          data.rental_mode ?? "",
        )
      )
        throw new Error(
          "Operatörlü / şoförlü veya sadece makine / araç seçeneğini belirt.",
        );
      if (
        data.end_date &&
        (!data.start_date || data.end_date < data.start_date)
      )
        throw new Error("Bitiş tarihi başlangıç tarihinden önce olamaz.");
      const result = post
        ? await db
            .from("market_posts")
            .update(data)
            .eq("id", post.id)
            .eq("owner_id", profile.id)
            .select("id")
            .single()
        : await db
            .from("market_posts")
            .insert({
              ...data,
              owner_id: profile.id,
              preferred_provider: preferred,
            })
            .select("id")
            .single();
      if (result.error) throw new Error(networkError(result.error));
      window.location.assign(`/is-agi/ilan/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }
  if (loading) return <p role="status">İlan hazırlanıyor…</p>;
  if (
    error &&
    !post &&
    new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search,
    ).has("edit")
  )
    return <ErrorBox error={error} />;
  return (
    <>
      <NetworkNav />
      <h1>{post ? "İlanını düzenle" : "İş ağı ilanı oluştur"}</h1>
      {preferred && (
        <p className="panel">
          Bu talep seçtiğin firmanın hesabında da görünecek. İlan herkese açık
          olacak; diğer üyeler de teklif verebilir.
        </p>
      )}
      <p className="lead">
        İhtiyacını açıkça anlat. Konum ve tarihler doğru teklifleri bulmanı
        kolaylaştırır.
      </p>
      <form className="panel network-form" onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="network-form-grid">
            <label>
              İlan türü
              <select
                value={kind}
                disabled={!!post}
                onChange={(e) => setKind(e.target.value as PostKind)}
              >
                {Object.entries(POST_KINDS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Makine / parça türü
              <select
                name="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Tür seç</option>
                <CategoryOptions includeParts={kind === "part_request" || kind === "job"} includeOther={kind === "part_request" || kind === "job"} />
              </select>
            </label>
          </div>
          <div className="network-form-grid">
            <BrandField
              category={category}
              name="brand"
              defaultValue={post?.brand ?? ""}
              label="Marka (isteğe bağlı)"
            />
            <label>
              Model / seri (isteğe bağlı)
              <input
                name="model"
                maxLength={120}
                defaultValue={post?.model ?? ""}
              />
            </label>
          </div>
          {kind === "rental_operator" && <label>Hizmet türü<select name="personnel_role" required defaultValue={post?.personnel_role ?? ""}>
            <option value="">Hizmet türünü seç</option>
            {Object.entries(PERSONNEL_ROLES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select></label>}
          {kind === "rental_machine" && (
            <fieldset className="rental-scope">
              <legend>Kiralama kapsamı</legend>
              <p className="sub">
                Gösterdiğin fiyatın operatör / şoför içerip içermediğini açıkça
                seç.
              </p>
              {Object.entries(RENTAL_MODES).map(([k, v]) => (
                <label key={k}>
                  <input
                    type="radio"
                    name="rental_mode"
                    value={k}
                    required
                    defaultChecked={post?.rental_mode === k}
                  />
                  <span>
                    <b>{v}</b>
                    <small>
                      {k === "with_operator"
                        ? "Makine veya araç, operatörü / şoförü ile verilir."
                        : "Operatör veya şoför bedeli bu ilandaki fiyata dahil değildir."}
                    </small>
                  </span>
                </label>
              ))}
              <p className="sub">
                Yakıt, nakliye, çalışma saati ve KDV koşullarını açıklamada
                ayrıca belirt. Her iki şekilde de kiralıyorsan kapsamı ve fiyatı
                farklı iki ilan açabilirsin.
              </p>
            </fieldset>
          )}
          <label>
            Başlık
            <input
              name="title"
              required
              minLength={5}
              maxLength={160}
              defaultValue={post?.title ?? ""}
              placeholder={
                kind === "job"
                  ? "Örn. Ankara’da 4 günlük hafriyat kamyonu işi"
                  : kind === "part_request"
                    ? "Örn. JCB 3CX hidrolik pompa arıyorum"
                    : "Örn. Günlük kiralık 20 ton ekskavatör"
              }
            />
          </label>
          <label>
            Açıklama
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={8000}
              rows={6}
              defaultValue={
                post?.description ??
                (requested
                  ? `Tercih ettiğim firma: ${requested}\n\nİşin ayrıntıları: `
                  : "")
              }
              placeholder="İşin kapsamı, araç kapasitesi, çalışma saatleri, nakliye, yakıt, operatör ve KDV dahil mi?"
            />
          </label>
          <div className="network-form-grid">
            <LocationFields
              city={post?.city ?? profile?.city}
              district={post?.district}
              lat={post?.lat}
              lng={post?.lng}
            />
            <label>
              Başlangıç / ihtiyaç tarihi
              <input
                type="date"
                name="start_date"
                defaultValue={post?.start_date ?? ""}
              />
            </label>
            <label>
              Bitiş tarihi
              <input
                type="date"
                name="end_date"
                defaultValue={post?.end_date ?? ""}
              />
            </label>
            <label>
              {kind === "part_request"
                ? "Adet"
                : kind === "rental_operator"
                  ? "Kişi sayısı"
                  : "Araç / makine sayısı"}
              <input
                name="quantity"
                type="number"
                min={1}
                max={100000}
                required
                defaultValue={post?.quantity ?? 1}
              />
            </label>
            <label>
              {kind.startsWith("rental")
                ? "Kiralama bedeli (₺)"
                : "Bütçe (₺, isteğe bağlı)"}
              <input
                name="price"
                type="number"
                min="0.01"
                max="999999999999.99"
                step="0.01"
                required={kind.startsWith("rental")}
                defaultValue={post?.price ?? ""}
              />
            </label>
            <label>
              Fiyat birimi
              <select
                name="price_unit"
                defaultValue={
                  post?.price_unit ??
                  (kind.startsWith("rental") ? "gün" : "toplam")
                }
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {kind === "part_request"
              ? "Marka, model, parça / OEM kodu ve uyumluluk"
              : "Kapasite, deneyim ve teknik özellikler"}
            <textarea
              name="specs"
              maxLength={1000}
              rows={3}
              defaultValue={post?.specs ?? ""}
            />
          </label>
          <p className="sub">
            İlanın herkese açık olur. Şifre, kimlik veya banka bilgisi paylaşma.
            Teklif seçimi ödeme ya da sözleşme oluşturmaz; ayrıntıları
            karşılıklı doğrulayın.
          </p>
          <ErrorBox error={error} />
          <button className="btn" type="submit">
            {busy
              ? "Kaydediliyor…"
              : post
                ? "Değişiklikleri kaydet"
                : "İlanı yayımla"}
          </button>
        </fieldset>
      </form>
    </>
  );
}

export function PostDetail({ id }: { id: string }) {
  const { profile, authReady } = useMarket();
  const [post, setPost] = useState<MarketPost | null>(null),
    [quotes, setQuotes] = useState<Quote[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0),
    [acting, setActing] = useState(false);
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    const db = client();
    if (!db) {
      setError("Veritabanı bağlantısı yok.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    setPost(null);
    setQuotes([]);
    void (async () => {
      const r = await db
        .from("market_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (r.error || !r.data) {
        setError(
          r.error
            ? networkError(r.error)
            : "İlan bulunamadı veya yayından kaldırıldı.",
        );
        setBusy(false);
        return;
      }
      setPost(r.data as MarketPost);
      if (profile) {
        const q = await db
          .from("market_quotes")
          .select("*")
          .eq("post_id", id)
          .order("created_at");
        if (!active) return;
        if (q.error)
          setError("İlan açıldı ancak teklifler yüklenemedi. Tekrar dene.");
        else setQuotes(q.data as Quote[]);
      } else setQuotes([]);
      setBusy(false);
    })();
    return () => {
      active = false;
    };
  }, [id, profile?.id, authReady, refresh]);
  async function changeStatus(status: string) {
    if (!post || !profile) return;
    if (
      !window.confirm(
        status === "removed"
          ? "İlanı yayından kaldırmak istiyor musun? Teklif geçmişi korunur."
          : status === "closed"
            ? "İlanı kapatmak istiyor musun? Yeni teklif alınmayacak."
            : "İlanı tekrar açmak istiyor musun?",
      )
    )
      return;
    setActing(true);
    const r = await client()!
      .from("market_posts")
      .update({ status })
      .eq("id", id)
      .eq("owner_id", profile.id)
      .select("id")
      .single();
    setActing(false);
    if (r.error) setError(networkError(r.error));
    else setRefresh((x) => x + 1);
  }
  if (busy) return <p role="status">İlan ve teklifler yükleniyor…</p>;
  if (!post)
    return (
      <>
        <NetworkNav />
        <ErrorBox error={error} />
        <button className="btn ghost" onClick={() => setRefresh((x) => x + 1)}>
          Tekrar dene
        </button>
      </>
    );
  const own = profile?.id === post.owner_id;
  const mine = quotes.find((q) => q.bidder_id === profile?.id);
  const selected = quotes.find((q) => q.status === "accepted");
  return (
    <>
      <NetworkNav />
      <div className="network-heading">
        <div>
          <span className="pill">
            {POST_KINDS[post.kind]} ·{" "}
            {post.status === "open"
              ? "Açık"
              : post.status === "closed"
                ? "Kapalı"
                : "Kaldırıldı"}
          </span>
          <h1>{post.title}</h1>
          <p className="lead">
            <Place item={post} />
          </p>
        </div>
        <strong className="network-price">
          {money(post.price, post.price_unit)}
        </strong>
      </div>
      <ErrorBox error={error} />
      {error && (
        <button className="btn ghost" onClick={() => setRefresh((x) => x + 1)}>
          Tekrar dene
        </button>
      )}
      <div className="network-detail">
        <article className="panel">
          <h2>İlanın ayrıntıları</h2>
          {post.kind === "rental_operator" && <p className="pill">{post.personnel_role ? PERSONNEL_ROLES[post.personnel_role] : "Hizmet türü belirtilmedi"}</p>}
          {post.kind === "rental_machine" && (
            <p className="rental-detail-scope">
              {rentalModeLabel(post.rental_mode)}
            </p>
          )}
          <p className="network-text">{post.description}</p>
          <dl className="network-facts">
            {post.kind === "rental_machine" && (
              <>
                <dt>Kiralama kapsamı</dt>
                <dd>{rentalModeLabel(post.rental_mode)}</dd>
              </>
            )}
            <dt>Tür</dt>
            <dd>{post.category}</dd>
            <dt>Marka / model</dt>
            <dd>
              {[post.brand, post.model].filter(Boolean).join(" ") ||
                "Belirtilmedi"}
            </dd>
            <dt>Miktar</dt>
            <dd>{post.quantity}</dd>
            <dt>Başlangıç</dt>
            <dd>{dateLabel(post.start_date) || "Görüşülecek"}</dd>
            <dt>Bitiş</dt>
            <dd>{dateLabel(post.end_date) || "Görüşülecek"}</dd>
            <dt>Teknik özellikler</dt>
            <dd className="network-text">{post.specs || "Belirtilmedi"}</dd>
          </dl>
          <a className="linkbtn" href={`/firmalar/${post.owner_id}`}>
            İlan sahibinin firma / hizmet profili →
          </a>
          {own && (
            <div className="network-actions">
              <a className="btn ghost sm" href={`/is-agi/yeni?edit=${id}`}>
                Düzenle
              </a>
              <button
                className="btn ghost sm"
                disabled={acting}
                onClick={() =>
                  changeStatus(post.status === "open" ? "closed" : "open")
                }
              >
                {post.status === "open" ? "İlanı kapat" : "Yeniden aç"}
              </button>
              {post.status !== "removed" && (
                <button
                  className="btn ghost sm"
                  disabled={acting}
                  onClick={() => changeStatus("removed")}
                >
                  Yayından kaldır
                </button>
              )}
            </div>
          )}
        </article>
        <aside className="panel">
          <h2>
            {own
              ? "Teklifleri yönet"
              : post.kind === "part_request"
                ? "Elinde bu parça var mı?"
                : post.kind.startsWith("rental")
                  ? "Kiralama için iletişime geç"
                  : "Bu işi yapabilir misin?"}
          </h2>
          <p>
            Fiyatın toplam mı, günlük mü olduğunu belirt. Nakliye, yakıt, KDV,
            müsaitlik ve kapsamı teklif notunda açıkla.
          </p>
          <p className="sub">
            Teklifler ve mesajlar yalnızca iki tarafça görülür. Seçim ödeme
            oluşturmaz; ödeme altyapısı yoktur.
          </p>
          {!own && !mine && post.status === "open" && (
            <Login>
              <QuoteForm post={post} onSaved={() => setRefresh((x) => x + 1)} />
            </Login>
          )}
          {!own && !mine && post.status !== "open" && (
            <p>Bu ilan yeni tekliflere kapalı.</p>
          )}
          {own && (
            <p>
              {quotes.length} teklif ·{" "}
              {selected
                ? "Bir teklif seçildi. İş tamamlandıysa ilanı kapatabilirsin."
                : "Gelen teklifleri aşağıda karşılaştır."}
            </p>
          )}
        </aside>
      </div>
      <section className="sect">
        <h2>{own ? "Gelen teklifler" : "Teklifim ve mesajlarım"}</h2>
        {profile && quotes.length === 0 && (
          <p className="sub">
            {own ? "Henüz teklif gelmedi." : "Henüz teklif vermedin."}
          </p>
        )}
        {quotes.map((q) => (
          <QuoteCard
            key={q.id}
            quote={q}
            own={own}
            open={post.status === "open"}
            selected={!!selected}
            onSaved={() => setRefresh((x) => x + 1)}
          />
        ))}
      </section>
    </>
  );
}
function QuoteForm({
  post,
  onSaved,
  existing,
}: {
  post: MarketPost;
  onSaved: () => void;
  existing?: Quote;
}) {
  const { profile } = useMarket();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const db = client();
    if (!db || !profile) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const data = {
      display_name: String(f.get("display_name")).trim(),
      amount: Number(f.get("amount")),
      price_unit: String(f.get("price_unit")),
      note: String(f.get("note")).trim(),
    };
    const r = existing
      ? await db
          .from("market_quotes")
          .update(data)
          .eq("id", existing.id)
          .select("id")
          .single()
      : await db
          .from("market_quotes")
          .insert({
            ...data,
            post_id: post.id,
            owner_id: post.owner_id,
            bidder_id: profile.id,
          })
          .select("id")
          .single();
    setBusy(false);
    if (r.error) setError(networkError(r.error));
    else onSaved();
  }
  return (
    <form className="network-form" onSubmit={save}>
      <fieldset disabled={busy}>
        <label>
          Adın / firma adın
          <input
            name="display_name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={
              existing?.display_name ??
              (profile?.store_name || profile?.full_name || "")
            }
          />
        </label>
        <label>
          {post.kind.startsWith("rental")
            ? "Önerdiğin kiralama bedeli (₺)"
            : "Teklif tutarın (₺)"}
          <input
            type="number"
            name="amount"
            min="0.01"
            max="999999999999.99"
            step="0.01"
            required
            defaultValue={existing?.amount ?? post.price ?? ""}
          />
        </label>
        <label>
          Fiyat birimi
          <select
            name="price_unit"
            defaultValue={existing?.price_unit ?? post.price_unit}
          >
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label>
          Açıklama / müsaitlik
          <textarea
            name="note"
            required
            minLength={10}
            maxLength={3000}
            rows={4}
            defaultValue={existing?.note ?? ""}
            placeholder="Kapsam, tarih, KDV ve teslimat dahil mi?"
          />
        </label>
        <ErrorBox error={error} />
        <button className="btn" type="submit">
          {busy
            ? "Gönderiliyor…"
            : existing
              ? "Teklifi güncelle"
              : post.kind === "part_request"
                ? "Bende var — teklif gönder"
                : "Teklif / kiralama talebi gönder"}
        </button>
      </fieldset>
    </form>
  );
}
function QuoteCard({
  quote: q,
  own,
  open,
  selected,
  onSaved,
}: {
  quote: Quote;
  own: boolean;
  open: boolean;
  selected: boolean;
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState(false);
  async function action(status: string) {
    if (
      status === "accepted" &&
      !window.confirm(
        "Bu teklifi seçmek istiyor musun? Seçim geri alınamaz ve ödeme oluşturmaz. Kapsamı mesajla doğrula.",
      )
    )
      return;
    setBusy(true);
    const r = await client()!
      .from("market_quotes")
      .update({ status })
      .eq("id", q.id)
      .select("id")
      .single();
    setBusy(false);
    if (r.error) setError(networkError(r.error));
    else onSaved();
  }
  return (
    <article className="panel network-quote">
      <div className="network-heading">
        <div>
          <h3>{q.display_name}</h3>
          <span className="pill">{QUOTE_STATUS[q.status]}</span>
          <a className="linkbtn" href={`/firmalar/${q.bidder_id}`}>
            {" "}
            Hizmet profili ↗
          </a>
        </div>
        <strong className="network-price">
          {money(q.amount, q.price_unit)}
        </strong>
      </div>
      <p className="network-text">{q.note}</p>
      <ErrorBox error={error} />
      {open && q.status === "pending" && (
        <div className="network-actions">
          {own ? (
            <>
              <button
                className="btn sm"
                disabled={busy || selected}
                onClick={() => action("accepted")}
              >
                Bu teklifi seç
              </button>
              <button
                className="btn ghost sm"
                disabled={busy}
                onClick={() => action("declined")}
              >
                Reddet
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost sm" onClick={() => setEdit(!edit)}>
                Teklifi düzenle
              </button>
              <button
                className="btn ghost sm"
                disabled={busy}
                onClick={() => action("withdrawn")}
              >
                Geri çek
              </button>
            </>
          )}
        </div>
      )}
      {edit && (
        <QuoteEditLoader
          q={q}
          onSaved={() => {
            setEdit(false);
            onSaved();
          }}
        />
      )}
      <QuoteMessages q={q} />
    </article>
  );
}
function QuoteEditLoader({ q, onSaved }: { q: Quote; onSaved: () => void }) {
  const [p, setP] = useState<MarketPost | null>(null);
  useEffect(() => {
    void client()
      ?.from("market_posts")
      .select("*")
      .eq("id", q.post_id)
      .single()
      .then((r) => setP(r.data));
  }, [q.post_id]);
  return p ? (
    <QuoteForm post={p} existing={q} onSaved={onSaved} />
  ) : (
    <p>İlan yükleniyor…</p>
  );
}
function QuoteMessages({ q }: { q: Quote }) {
  const { profile } = useMarket();
  const [messages, setMessages] = useState<
      { id: string; sender_id: string; body: string; created_at: string }[]
    >([]),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [text, setText] = useState(""),
    [more, setMore] = useState(false),
    [limit, setLimit] = useState(50);
  useEffect(() => {
    if (!show) return;
    let active = true;
    void client()
      ?.from("market_quote_messages")
      .select("*")
      .eq("quote_id", q.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1)
      .then((r) => {
        if (!active) return;
        if (r.error) setError("Mesajlar yüklenemedi.");
        else {
          setMessages((r.data ?? []).slice(0, limit).reverse());
          setMore((r.data ?? []).length > limit);
          setError("");
        }
      });
    return () => {
      active = false;
    };
  }, [q.id, show, refresh, limit]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!profile || !text.trim()) return;
    setBusy(true);
    const r = await client()!
      .from("market_quote_messages")
      .insert({ quote_id: q.id, sender_id: profile.id, body: text.trim() });
    setBusy(false);
    if (r.error) setError(networkError(r.error));
    else {
      setText("");
      setRefresh((x) => x + 1);
    }
  }
  return (
    <div className="network-chat">
      <button
        type="button"
        className="btn ghost sm"
        aria-expanded={show}
        onClick={() => setShow(!show)}
      >
        {show ? "Mesajları gizle" : "Özel mesajlar"}
      </button>
      {show && (
        <>
          <div className="network-actions">
            <button
              className="btn ghost sm"
              onClick={() => setRefresh((x) => x + 1)}
            >
              Mesajları yenile
            </button>
            {more && (
              <button
                className="btn ghost sm"
                onClick={() => setLimit((x) => x + 50)}
              >
                Önceki mesajları yükle
              </button>
            )}
          </div>
          <ErrorBox error={error} />
          <ol className="network-messages">
            {messages.map((m) => (
              <li
                key={m.id}
                className={m.sender_id === profile?.id ? "mine" : ""}
              >
                <b>
                  {m.sender_id === profile?.id
                    ? "Sen"
                    : m.sender_id === q.bidder_id
                      ? q.display_name
                      : "İlan sahibi"}
                </b>
                <p className="network-text">{m.body}</p>
                <time dateTime={m.created_at}>
                  {new Date(m.created_at).toLocaleString("tr-TR")}
                </time>
              </li>
            ))}
          </ol>
          {messages.length === 0 && !error && (
            <p className="sub">
              Henüz mesaj yok. Kapsamı ve tarihleri burada netleştirin.
            </p>
          )}
          {["pending", "accepted"].includes(q.status) ? (
            <form className="network-form" onSubmit={send}>
              <label>
                Özel mesaj
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  maxLength={3000}
                  rows={3}
                />
              </label>
              <button className="btn sm" disabled={busy || !text.trim()}>
                {busy ? "Gönderiliyor…" : "Mesaj gönder"}
              </button>
            </form>
          ) : (
            <p className="sub">
              Sonuçlanmış tekliflerde mesaj geçmişi korunur; yeni mesaj
              gönderilemez.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function ProviderDirectory({
  companyOnly = false,
}: {
  companyOnly?: boolean;
}) {
  const [providers, setProviders] = useState<Provider[]>([]),
    [kind, setKind] = useState(""),
    [city, setCity] = useState(""),
    [activity, setActivity] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [companyCategory, setCompanyCategory] = useState(""),
    [filtersReady, setFiltersReady] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCity = params.get("city");
    if (initialCity && (CITIES as readonly string[]).includes(initialCity))
      setCity(initialCity);
    setQ((params.get("q") || "").slice(0, 200));
    setFiltersReady(true);
  }, []);
  useEffect(() => {
    if (!filtersReady) return;
    let active = true;
    setBusy(true);
    setError("");
    const db = client();
    if (!db) {
      setError("Veritabanı bağlantısı yok.");
      setBusy(false);
      return;
    }
    let query = db
      .from("service_providers")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    if (companyOnly)
      query = query.or("company_category.not.is.null,kind.neq.operator");
    if (companyCategory) query = query.eq("company_category", companyCategory);
    if (kind) query = query.eq("kind", kind);
    if (city) query = query.contains("service_cities", [city]);
    if (activity) query = query.contains("specialties", [activity]);
    if (q.trim())
      query = query.ilike("name", `%${q.trim().replace(/[%_\\]/g, "")}%`);
    void query.then((r) => {
      if (!active) return;
      if (r.error) setError(networkError(r.error));
      else {
        setProviders((r.data ?? []).slice(0, PAGE_SIZE) as Provider[]);
        setMore((r.data ?? []).length > PAGE_SIZE);
      }
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [
    kind,
    city,
    activity,
    q,
    page,
    refresh,
    companyOnly,
    companyCategory,
    filtersReady,
  ]);
  return (
    <>
      <NetworkNav />
      <div className="network-heading">
        <div>
          <span className="eyebrow">YEREL HİZMET AĞI</span>
          <h1>
            {companyOnly
              ? "Şirketleri ve filolarını keşfet."
              : "İşini yapacak firmayı bul."}
          </h1>
          <p className="lead">
            Hafriyat firmaları, parçacılar, kiralama şirketleri ve operatörler.
            Hizmet verilen ile ve iş alanına göre seç.
          </p>
        </div>
        <a className="btn" href="/firma-kaydi">
          Firma / hizmet profili oluştur
        </a>
      </div>
      <div className="network-filters">
        <label>
          Şirket kategorisi
          <select
            value={companyCategory}
            onChange={(e) => {
              setCompanyCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tüm şirket kategorileri</option>
            {COMPANY_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Firma adı
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Firma ara"
          />
        </label>
        <label>
          Firma türü
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tüm türler</option>
            {Object.entries(PROVIDER_KINDS).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hizmet verilen il
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tüm iller</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          İş alanı
          <select
            value={activity}
            onChange={(e) => {
              setActivity(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tüm alanlar</option>
            {ACTIVITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <ErrorBox error={error} />
      {error && (
        <button className="btn ghost" onClick={() => setRefresh((x) => x + 1)}>
          Tekrar dene
        </button>
      )}
      {busy ? (
        <p role="status">Firmalar yükleniyor…</p>
      ) : !error && providers.length === 0 ? (
        <div className="panel network-empty">
          <h2>Bu bölgede henüz kayıt yok</h2>
          <p>Filtreleri değiştir veya firmanı rehbere ekle.</p>
        </div>
      ) : (
        <div className="network-cards">
          {providers.map((p) => (
            <article key={p.user_id} className="panel network-card">
              <span className="pill">
                {p.company_category || PROVIDER_KINDS[p.kind]}
              </span>
              <h2>
                <a href={`/firmalar/${p.user_id}`}>{p.name}</a>
              </h2>
              <Place item={p} />
              <p>{p.description.slice(0, 160)}</p>
              <div className="network-tags">
                {p.specialties.map((s) => (
                  <span className="pill" key={s}>
                    {s}
                  </span>
                ))}
              </div>
              <p className="sub">
                Hizmet bölgeleri: {p.service_cities.join(", ")}
              </p>
              <a className="linkbtn" href={`/firmalar/${p.user_id}`}>
                Şirketi ve envanterini incele →
              </a>
            </article>
          ))}
        </div>
      )}
      <div className="network-actions">
        <button
          className="btn ghost"
          disabled={!page || busy}
          onClick={() => setPage((x) => x - 1)}
        >
          Önceki
        </button>
        <span>Sayfa {page + 1}</span>
        <button
          className="btn ghost"
          disabled={!more || busy}
          onClick={() => setPage((x) => x + 1)}
        >
          Sonraki
        </button>
      </div>
      <p className="sub">
        Firma bilgileri üyelerin kendi beyanıdır. Ekipman, belge, referans ve iş
        kapsamını çalışmadan önce doğrulayın.
      </p>
    </>
  );
}
export function ProviderEditor() {
  return (
    <Login>
      <ProviderEditorForm />
    </Login>
  );
}
function ProviderEditorForm() {
  const { profile } = useMarket();
  const [provider, setProvider] = useState<Provider | null>(null),
    [areas, setAreas] = useState<string[]>([]),
    [activities, setActivities] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const db = client();
    if (!db) {
      setError("Veritabanı bağlantısı yok.");
      setFailed(true);
      setLoading(false);
      return;
    }
    setFailed(false);
    setLoading(true);
    void db
      .from("service_providers")
      .select("*")
      .eq("user_id", profile!.id)
      .maybeSingle()
      .then((r) => {
        if (r.error) {
          setError(networkError(r.error));
          setFailed(true);
        } else if (r.data) {
          setProvider(r.data);
          setAreas(r.data.service_cities);
          setActivities(r.data.specialties);
        } else setAreas(profile?.city ? [profile.city] : []);
        setLoading(false);
      });
  }, [profile?.id, refresh]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    if (!areas.length || !activities.length) {
      setError("En az bir hizmet ili ve iş alanı seç.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const data = {
        ...locationData(f),
        name: String(f.get("name")).trim(),
        kind: String(f.get("kind")),
        company_category: String(f.get("company_category") || "") || null,
        description: String(f.get("description")).trim(),
        service_cities: areas,
        specialties: activities,
        published: f.get("published") === "on",
      };
      const db = client()!;
      const r = provider
        ? await db
            .from("service_providers")
            .update(data)
            .eq("user_id", profile.id)
            .select("user_id")
            .single()
        : await db
            .from("service_providers")
            .insert({ ...data, user_id: profile.id })
            .select("user_id")
            .single();
      if (r.error) throw new Error(networkError(r.error));
      window.location.assign(`/firmalar/${profile.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Hizmet profili yükleniyor…</p>;
  if (failed)
    return (
      <>
        <ErrorBox error={error} />
        <button className="btn ghost" onClick={() => setRefresh((x) => x + 1)}>
          Tekrar dene
        </button>
      </>
    );
  return (
    <>
      <NetworkNav />
      <h1>Firma / hizmet profilin</h1>
      <p className="lead">
        Hangi bölgede, hangi işleri yaptığını göster. Aynı hesabınla ilan
        verebilir ve fiyat teklifi gönderebilirsin.
      </p>
      <p>
        <a className="linkbtn" href="/envanterim">
          Şirketinin makine ve araç envanterini yönet →
        </a>
      </p>
      <form className="panel network-form" onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="network-form-grid">
            <label>
              Firma / hizmet adı
              <input
                name="name"
                minLength={2}
                maxLength={120}
                required
                defaultValue={
                  provider?.name ??
                  (profile?.store_name || profile?.full_name || "")
                }
              />
            </label>
            <label>
              Profil türü
              <select name="kind" defaultValue={provider?.kind ?? "excavation"}>
                {Object.entries(PROVIDER_KINDS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Şirket kategorisi
            <select
              name="company_category"
              defaultValue={provider?.company_category ?? ""}
            >
              <option value="">Bireysel hizmet / seçilmedi</option>
              {COMPANY_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Hizmetlerini anlat
            <textarea
              name="description"
              minLength={20}
              maxLength={5000}
              required
              rows={5}
              defaultValue={provider?.description ?? ""}
              placeholder="Ekipman, kapasite, deneyim ve sunduğun hizmetler"
            />
          </label>
          <div className="network-form-grid">
            <LocationFields
              city={provider?.city ?? profile?.city}
              district={provider?.district}
              lat={provider?.lat}
              lng={provider?.lng}
            />
          </div>
          <fieldset className="network-choices">
            <legend>İş yaptığın alanlar</legend>
            {ACTIVITIES.map((a) => (
              <label key={a}>
                <input
                  type="checkbox"
                  checked={activities.includes(a)}
                  onChange={(e) =>
                    setActivities(
                      e.target.checked
                        ? [...activities, a]
                        : activities.filter((x) => x !== a),
                    )
                  }
                />
                {a}
              </label>
            ))}
          </fieldset>
          <fieldset className="network-choices network-cities">
            <legend>Hizmet verdiğin iller</legend>
            {CITIES.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={areas.includes(c)}
                  onChange={(e) =>
                    setAreas(
                      e.target.checked
                        ? [...areas, c]
                        : areas.filter((x) => x !== c),
                    )
                  }
                />
                {c}
              </label>
            ))}
          </fieldset>
          <label className="network-check">
            <input
              type="checkbox"
              name="published"
              defaultChecked={provider?.published ?? true}
            />
            Profilimi firma rehberinde yayımla
          </label>
          <p className="sub">
            Profil adı, açıklama, iş alanları, hizmet illeri ve eklediğin harita
            konumu herkese açık olur. Hesap başına bir hizmet profili
            oluşturabilirsin.
          </p>
          <ErrorBox error={error} />
          <button className="btn">
            {busy ? "Kaydediliyor…" : "Hizmet profilini kaydet"}
          </button>
        </fieldset>
      </form>
    </>
  );
}
export function ProviderDetail({ id }: { id: string }) {
  const { profile, authReady } = useMarket();
  const [provider, setProvider] = useState<Provider | null>(null),
    [posts, setPosts] = useState<MarketPost[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    const db = client();
    if (!db) {
      setError("Veritabanı bağlantısı yok.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    setProvider(null);
    setPosts([]);
    void (async () => {
      const r = await db
        .from("service_providers")
        .select("*")
        .eq("user_id", id)
        .maybeSingle();
      if (!active) return;
      if (r.error) setError(networkError(r.error));
      else if (!r.data)
        setError("Bu üyenin yayımlanmış bir hizmet profili bulunmuyor.");
      else {
        setProvider(r.data);
        const p = await db
          .from("market_posts")
          .select("*")
          .eq("owner_id", id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(24);
        if (!active) return;
        if (p.error)
          setError("Hizmet profili açıldı ancak ilanlar yüklenemedi.");
        else setPosts(p.data as MarketPost[]);
      }
      setBusy(false);
    })();
    return () => {
      active = false;
    };
  }, [id, authReady, profile?.id, refresh]);
  if (busy) return <p role="status">Hizmet profili yükleniyor…</p>;
  return (
    <>
      <NetworkNav />
      <ErrorBox error={error} />
      {error && (
        <button className="btn ghost" onClick={() => setRefresh((x) => x + 1)}>
          Tekrar dene
        </button>
      )}
      {provider ? (
        <>
          <div className="network-heading">
            <div>
              <span className="pill">
                {provider.company_category || PROVIDER_KINDS[provider.kind]}
                {!provider.published ? " · Yayımlanmıyor" : ""}
              </span>
              <h1>{provider.name}</h1>
              <p className="lead">
                <Place item={provider} />
              </p>
            </div>
            {profile?.id === id ? (
              <a className="btn" href="/firma-kaydi">
                Profili düzenle
              </a>
            ) : (
              <a
                className="btn"
                href={`/is-agi/yeni?kind=${provider.kind === "supplier" ? "part_request" : "job"}&provider=${provider.user_id}&firma=${encodeURIComponent(provider.name)}`}
              >
                Bu firma için talep oluştur
              </a>
            )}
          </div>
          <article className="panel">
            <h2>Hizmetler</h2>
            <p className="network-text">{provider.description}</p>
            <div className="network-tags">
              {provider.specialties.map((s) => (
                <span className="pill" key={s}>
                  {s}
                </span>
              ))}
            </div>
            <h3>Hizmet verilen iller</h3>
            <div className="network-tags">
              {provider.service_cities.map((s) => (
                <a
                  className="pill"
                  key={s}
                  href={`/is-agi/yeni?kind=job&provider=${provider.user_id}&firma=${encodeURIComponent(provider.name)}`}
                >
                  {s}
                </a>
              ))}
            </div>
            <p className="sub">
              Talebin herkese açık yayımlanır. Tercih ettiğin firma talebi kendi
              iş ağı hesabında görür. Diğer üyeler de teklif verebilir. Profil
              bilgileri üyenin kendi beyanıdır.
            </p>
          </article>
          <CompanyInventory ownerId={provider.user_id} />
          <section className="sect">
            <h2>Firmanın açık iş ağı ilanları</h2>
            {posts.length ? (
              <div className="network-cards">
                {posts.map((p) => (
                  <PostCard post={p} key={p.id} />
                ))}
              </div>
            ) : (
              <p>Henüz açık ilanı yok.</p>
            )}
          </section>
        </>
      ) : profile?.id === id ? (
        <a className="btn" href="/firma-kaydi">
          Hizmet profilini oluştur
        </a>
      ) : null}
    </>
  );
}
export function NetworkAccount() {
  return (
    <Login>
      <NetworkAccountData />
    </Login>
  );
}
function NetworkAccountData() {
  const { profile } = useMarket();
  const [posts, setPosts] = useState<MarketPost[]>([]),
    [quotes, setQuotes] = useState<Quote[]>([]),
    [incoming, setIncoming] = useState<Quote[]>([]),
    [requests, setRequests] = useState<MarketPost[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const db = client();
    if (!db) {
      setError("Veritabanı bağlantısı yok.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    void Promise.all([
      db
        .from("market_posts")
        .select("*")
        .eq("owner_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("market_quotes")
        .select("*")
        .eq("bidder_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("market_quotes")
        .select("*")
        .eq("owner_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("market_posts")
        .select("*")
        .eq("preferred_provider", profile!.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100),
    ]).then(([p, q, i, r]) => {
      if (!active) return;
      if (p.error || q.error || i.error || r.error)
        setError("İşlerin ve teklifler yüklenemedi. Tekrar dene.");
      else {
        setPosts(p.data as MarketPost[]);
        setQuotes(q.data as Quote[]);
        setIncoming(i.data as Quote[]);
        setRequests(r.data as MarketPost[]);
      }
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [profile?.id, refresh]);
  return (
    <>
      <NetworkNav />
      <div className="network-heading">
        <h1>İşlerim ve tekliflerim</h1>
        <div className="network-actions">
          <a className="btn" href="/is-agi/yeni">
            Yeni ilan
          </a>
          <a className="btn ghost" href="/firma-kaydi">
            Hizmet profilim
          </a>
        </div>
      </div>
      <ErrorBox error={error} />
      {error && (
        <button className="btn ghost" onClick={() => setRefresh((x) => x + 1)}>
          Tekrar dene
        </button>
      )}
      {busy ? (
        <p>Yükleniyor…</p>
      ) : (
        <>
          <h2>Firmamdan istenen işler / parçalar</h2>
          {requests.length ? (
            <div className="network-cards">
              {requests.map((p) => (
                <PostCard post={p} key={p.id} />
              ))}
            </div>
          ) : (
            <p>Henüz doğrudan bir talep gelmedi.</p>
          )}
          <h2>İş ağı ilanlarım</h2>
          {posts.length ? (
            <div className="network-cards">
              {posts.map((p) => (
                <PostCard post={p} key={p.id} />
              ))}
            </div>
          ) : (
            <p>Henüz ilan açmadın.</p>
          )}
          <section className="sect">
            <h2>Gelen teklifler</h2>
            {incoming.length ? (
              incoming.map((q) => (
                <a
                  className="panel network-quote network-account-row"
                  href={`/is-agi/ilan/${q.post_id}`}
                  key={q.id}
                >
                  <span>
                    <b>{q.display_name}</b> · {QUOTE_STATUS[q.status]}
                  </span>
                  <strong>{money(q.amount, q.price_unit)}</strong>
                  <span className="linkbtn">İlana ve mesajlara git →</span>
                </a>
              ))
            ) : (
              <p>Henüz teklif gelmedi.</p>
            )}
          </section>
          <section className="sect">
            <h2>Verdiğim teklifler / kiralama talepleri</h2>
            {quotes.length ? (
              quotes.map((q) => (
                <a
                  className="panel network-quote network-account-row"
                  href={`/is-agi/ilan/${q.post_id}`}
                  key={q.id}
                >
                  <span>
                    {QUOTE_STATUS[q.status]} ·{" "}
                    {new Date(q.created_at).toLocaleDateString("tr-TR")}
                  </span>
                  <strong>{money(q.amount, q.price_unit)}</strong>
                  <span className="linkbtn">İlana ve mesajlara git →</span>
                </a>
              ))
            ) : (
              <p>Henüz teklif vermedin.</p>
            )}
          </section>
          <p className="sub">
            En son 100 kayıt gösterilir. Satılık ilanların{" "}
            <a className="linkbtn" href="/ilanlarim">
              İlanlarım
            </a>{" "}
            bölümündedir.
          </p>
        </>
      )}
    </>
  );
}
