"use client";
import { useEffect, useState, type FormEvent } from "react";
import { MACHINE_CATEGORIES } from "@/lib/data/constants";
import {
  EQUIPMENT_STATUS,
  networkError,
  type InventoryItem,
} from "@/lib/network";
import { getSupabase } from "@/lib/supabase/client";
import { CategoryOptions, BrandField } from "./CatalogControls";
import { canonicalBrand } from "@/lib/machineryCatalog";
import { useMarket } from "./MarketProvider";
export function CompanyInventory({
  ownerId,
  manage = false,
}: {
  ownerId?: string;
  manage?: boolean;
}) {
  const { profile, authReady } = useMarket();
  const id = ownerId ?? profile?.id;
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [providerExists, setProviderExists] = useState(false),
    [refresh, setRefresh] = useState(0),
    [editing, setEditing] = useState<InventoryItem | null>(null),
    [showForm, setShowForm] = useState(false),
    [busy, setBusy] = useState(false),
    [providerName, setProviderName] = useState("");
  useEffect(() => {
    if (!authReady) return;
    let active = true;
    setItems([]);
    setError("");
    setProviderExists(false);
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const db = getSupabase();
    if (!db) {
      setError("Veritabanı bağlantısı kullanılamıyor.");
      setLoading(false);
      return;
    }
    void Promise.all([
      db
        .from("service_providers")
        .select("user_id,name")
        .eq("user_id", id)
        .maybeSingle(),
      db
        .from("company_inventory")
        .select("*")
        .eq("owner_id", id)
        .order("created_at", { ascending: false })
        .limit(200),
    ])
      .then(([p, r]) => {
        if (!active) return;
        if (p.error || r.error) setError("Envanter yüklenemedi. Tekrar dene.");
        else {
          setProviderExists(!!p.data);
          setProviderName(p.data?.name || "");
          setItems(r.data as InventoryItem[]);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("Envanter yüklenemedi.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, authReady, refresh]);
  useEffect(() => {
    setEditing(null);
    setShowForm(false);
  }, [id]);
  useEffect(() => {
    if (showForm)
      document
        .getElementById("inventory-editor")
        ?.scrollIntoView({ block: "start" });
  }, [showForm, editing?.id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile || !id || profile.id !== id) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const data = {
      category: String(f.get("category")),
      brand: canonicalBrand(String(f.get("brand") || "")),
      model: String(f.get("model")).trim(),
      year: f.get("year") ? Number(f.get("year")) : null,
      quantity: Number(f.get("quantity")),
      capacity: String(f.get("capacity") || "").trim(),
      description: String(f.get("description") || "").trim(),
      availability: String(f.get("availability")),
      published: f.get("published") === "on",
    };
    const db = getSupabase()!;
    try {
      const r = editing
        ? await db
            .from("company_inventory")
            .update(data)
            .eq("id", editing.id)
            .eq("owner_id", id)
            .select("id")
            .single()
        : await db
            .from("company_inventory")
            .insert({ ...data, owner_id: id })
            .select("id")
            .single();
      if (r.error) {
        setError(networkError(r.error));
      } else {
        setEditing(null);
        setShowForm(false);
        setRefresh((x) => x + 1);
      }
    } catch {
      setError("Envanter kaydedilemedi. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: InventoryItem) {
    if (
      !window.confirm(
        `${item.brand} ${item.model} kaydını envanterinden silmek istiyor musun?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const r = await getSupabase()!
        .from("company_inventory")
        .delete()
        .eq("id", item.id)
        .eq("owner_id", profile!.id)
        .select("id")
        .single();
      if (r.error) setError(networkError(r.error));
      else {
        if (editing?.id === item.id) {
          setEditing(null);
          setShowForm(false);
        }
        setRefresh((x) => x + 1);
      }
    } catch {
      setError("Kayıt silinemedi.");
    } finally {
      setBusy(false);
    }
  }
  const canManage = manage && !!profile && profile.id === id;
  if (!authReady || loading)
    return <p role="status">Şirket envanteri yükleniyor…</p>;
  if (manage && !profile)
    return (
      <div className="panel">
        <h1>Şirketin ve envanterin</h1>
        <p>Şirket profilini ve ekipmanlarını yönetmek için giriş yap.</p>
        <a className="btn" href="/giris">
          Giriş yap / Kayıt ol
        </a>
      </div>
    );
  return (
    <section className="company-inventory">
      <div className="home-section-heading">
        <div>
          <span className="home-small-label">ŞİRKET FİLOSU</span>
          {manage ? (
            <h1>
              {providerName
                ? `${providerName} — Envanterim`
                : "Şirketim ve envanterim"}
            </h1>
          ) : (
            <h2>Makine ve araç envanteri</h2>
          )}
        </div>
        {canManage && providerExists && (
          <button
            className="btn sm"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setCategory("");
              setShowForm(true);
            }}
          >
            + Ekipman ekle
          </button>
        )}
      </div>
      {error && (
        <div className="network-error" role="alert">
          {error}
          <button
            className="btn ghost sm"
            onClick={() => setRefresh((x) => x + 1)}
          >
            Tekrar dene
          </button>
        </div>
      )}
      {manage && (
        <>
          <p className="lead">
            Sahip olduğun makineleri ve araçları şirket vitrininde göster. Bu
            kayıtlar satılık veya kiralık ilanı oluşturmaz.
          </p>
          <div className="network-actions">
            <a className="btn ghost sm" href="/firma-kaydi">
              Şirket profilini düzenle
            </a>
            {providerExists && (
              <a className="btn ghost sm" href={`/firmalar/${id}`}>
                Şirket vitrinini gör ↗
              </a>
            )}
            <a className="btn ghost sm" href="/sirketler">
              Şirket rehberi
            </a>
          </div>
        </>
      )}
      {!providerExists && !error && manage && (
        <div className="panel home-empty">
          <h2>Önce şirket profilini oluştur</h2>
          <p>
            Şirket adını, kategorisini ve hizmet bölgelerini ekledikten sonra
            filonu tanımlayabilirsin.
          </p>
          <a className="btn" href="/firma-kaydi">
            Şirket profili oluştur →
          </a>
        </div>
      )}
      {canManage && providerExists && showForm && (
        <form
          id="inventory-editor"
          className="panel network-form inventory-form"
          onSubmit={save}
          key={editing?.id ?? "new"}
        >
          <h2>{editing ? "Ekipmanı düzenle" : "Envantere ekipman ekle"}</h2>
          <fieldset disabled={busy}>
            <div className="network-form-grid">
              <label>
                Makine / araç türü
                <select
                  name="category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Tür seç</option>
                  <CategoryOptions includeParts={false} includeOther />
                </select>
              </label>
              <BrandField
                category={category}
                name="brand"
                defaultValue={editing?.brand ?? ""}
              />
              <label>
                Model
                <input
                  name="model"
                  required
                  maxLength={120}
                  defaultValue={editing?.model ?? ""}
                  placeholder="Örn. SY215C"
                />
              </label>
              <label>
                Model yılı
                <input
                  type="number"
                  name="year"
                  min={1950}
                  max={new Date().getFullYear() + 1}
                  defaultValue={editing?.year ?? ""}
                />
              </label>
              <label>
                Adet
                <input
                  type="number"
                  name="quantity"
                  min={1}
                  max={10000}
                  required
                  defaultValue={editing?.quantity ?? 1}
                />
              </label>
              <label>
                Kapasite / özellik
                <input
                  name="capacity"
                  maxLength={200}
                  defaultValue={editing?.capacity ?? ""}
                  placeholder="Örn. 22 ton / 1 m³ kova"
                />
              </label>
              <label>
                Durum
                <select
                  name="availability"
                  defaultValue={editing?.availability ?? "available"}
                >
                  {Object.entries(EQUIPMENT_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Açıklama
              <textarea
                name="description"
                maxLength={1500}
                rows={3}
                defaultValue={editing?.description ?? ""}
              />
            </label>
            <label className="network-check">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing?.published ?? true}
              />
              Bu ekipmanı şirket profilimde göster
            </label>
            <p className="sub">
              Plaka, şasi numarası veya özel belge eklemene gerek yok. Şirket
              profilin gizliyse envanterin de diğer ziyaretçilere görünmez.
            </p>
            <div className="network-actions">
              <button className="btn" type="submit">
                {busy ? "Kaydediliyor…" : "Ekipmanı kaydet"}
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditing(null);
                  setShowForm(false);
                }}
              >
                Vazgeç
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {items.length > 0 ? (
        <>
          <div className="inventory-summary">
            <strong>{items.reduce((sum, i) => sum + i.quantity, 0)}</strong>
            <span>listelenen araç / makine · {items.length} ekipman grubu</span>
          </div>
          <div className="inventory-grid">
            {items.map((item) => (
              <article className="inventory-card" key={item.id}>
                <div className="inventory-card-top">
                  <span>{item.category}</span>
                  <span className={`inventory-status ${item.availability}`}>
                    {EQUIPMENT_STATUS[item.availability]}
                  </span>
                </div>
                <h3>{[item.brand, item.model].filter(Boolean).join(" ")}</h3>
                <dl>
                  <div>
                    <dt>Adet</dt>
                    <dd>{item.quantity}</dd>
                  </div>
                  {item.year && (
                    <div>
                      <dt>Yıl</dt>
                      <dd>{item.year}</dd>
                    </div>
                  )}
                  {item.capacity && (
                    <div>
                      <dt>Kapasite</dt>
                      <dd>{item.capacity}</dd>
                    </div>
                  )}
                </dl>
                {item.description && (
                  <p className="network-text">{item.description}</p>
                )}
                {canManage && (
                  <>
                    <p className="sub">
                      {item.published
                        ? "Profilde gösteriliyor (şirket profilin yayımlanmışsa)"
                        : "Gizli — yalnızca sen görürsün"}
                    </p>
                    <div className="network-actions">
                      <button
                        className="btn ghost sm"
                        disabled={busy}
                        onClick={() => {
                          setEditing(item);
                          setCategory(item.category);
                          setShowForm(true);
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        className="btn ghost sm"
                        disabled={busy}
                        onClick={() => remove(item)}
                      >
                        Sil
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
          {items.length === 200 && (
            <p className="sub">En son 200 ekipman grubu gösteriliyor.</p>
          )}
        </>
      ) : (
        providerExists &&
        !error && (
          <div className="home-empty">
            <p>
              {manage
                ? "Henüz envanter eklemedin. İlk makinen veya kamyonunla başla."
                : "Şirket henüz görünür bir ekipman kaydı eklememiş."}
            </p>
          </div>
        )
      )}
      {!manage && items.length > 0 && (
        <p className="sub">
          Envanter ve müsaitlik bilgileri şirketin kendi beyanıdır. İş öncesinde
          güncel durumu doğrulayın.
        </p>
      )}
    </section>
  );
}
