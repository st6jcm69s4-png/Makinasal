"use client";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useMarket } from "./MarketProvider";
import { getSupabase } from "@/lib/supabase/client";

type Note = { id: string; kind: "message" | "price_drop"; title: string; body: string; url: string; read_at: string | null; created_at: string };

export function NotificationsView() {
  const { t: tr, language } = useLanguage();
  const { profile, authReady } = useMarket();
  const [items, setItems] = useState<Note[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    const db = getSupabase();
    if (!db || !profile) { setState("ready"); return; }
    const { data, error } = await db.from("notifications").select("id,kind,title,body,url,read_at,created_at").order("created_at", { ascending: false }).limit(50);
    if (error) { setState("error"); return; }
    setItems((data ?? []) as Note[]); setState("ready");
  }, [profile]);
  useEffect(() => { if (authReady) void load(); }, [authReady, load]);

  async function markAllRead() {
    const db = getSupabase();
    if (!db) return;
    const { error } = await db.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (!error) setItems((cur) => cur.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }));
  }
  async function open(n: Note) {
    const db = getSupabase();
    if (db && !n.read_at) await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    window.location.assign(n.url.startsWith("/") && !n.url.startsWith("//") ? n.url : "/");
  }

  if (!authReady || state === "loading") return <p role="status">{tr("Yükleniyor…")}</p>;
  if (!profile) return <div className="panel"><h1>{tr("Bildirimler")}</h1><p>{tr("Bildirimlerini görmek için giriş yap.")}</p><a className="btn" href="/giris?next=%2Fbildirimler">{tr("Giriş yap")}</a></div>;
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <>
      <h1>{tr("Bildirimler")}</h1>
      {state === "error" ? <p className="err" role="alert">{tr("Bildirimler yüklenemedi. Bağlantını kontrol edip tekrar dene.")}</p> : null}
      {unread > 0 ? <button className="btn ghost" type="button" onClick={markAllRead}>{tr("Hepsini okundu işaretle")}</button> : null}
      {items.length === 0 && state === "ready" ? <div className="empty">{tr("Henüz bildirimin yok.")}</div> : (
        <ul className="notes" style={{ listStyle: "none", padding: 0 }}>
          {items.map((n) => (
            <li key={n.id} className="card" style={{ padding: 14, marginTop: 10, opacity: n.read_at ? 0.7 : 1 }}>
              <button type="button" className="linkbtn" onClick={() => void open(n)} style={{ textAlign: "left", width: "100%" }}>
                <b>{tr(n.title)}</b>{!n.read_at ? <span className="pill" style={{ marginLeft: 8 }}>{tr("Yeni")}</span> : null}
                {n.body ? <span className="sub" style={{ display: "block" }}>{n.body}</span> : null}
                <span className="sub">{new Date(n.created_at).toLocaleString(language === "en" ? "en-GB" : "tr-TR")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
