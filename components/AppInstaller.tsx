'use client';
import { useEffect, useState } from 'react';
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function AppServiceWorker() {
  useEffect(() => { if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);
  return null;
}
export function AppInstaller() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    const receive = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', receive); window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', receive); window.removeEventListener('appinstalled', complete); };
  }, []);
  if (installed) return <p className="note good" role="status">Makinasal ana ekranından açıldı.</p>;
  return <div className="panel"><h2>Telefonuna ekle</h2>
    {prompt ? <p><button className="btn" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>Makinasal’ı yükle</button></p> : null}
    <p><b>iPhone:</b> Siteyi Safari’de aç. Paylaş düğmesine, ardından “Ana Ekrana Ekle” seçeneğine dokun.</p>
    <p><b>Android:</b> Chrome menüsündeki “Uygulamayı yükle” veya “Ana ekrana ekle” seçeneğini kullan.</p>
    <p className="sub">İlanlar, mesajlar ve hesap işlemleri internet bağlantısıyla çalışır. Bu sürüm uygulama mağazalarından indirilmez.</p></div>;
}
