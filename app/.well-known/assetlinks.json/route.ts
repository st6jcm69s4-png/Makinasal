// Android "uygulama bağlantısı" doğrulaması: makinasal.com bağlantıları uygulama yüklüyse uygulamada açılır.
// ANDROID_CERT_SHA256 (Google Play uygulama imzalama sertifikasının SHA-256 parmak izi; birden fazlaysa virgülle)
// Vercel ortam değişkenine girilince etkinleşir.
const PACKAGE = 'tr.com.makinasal.app';

export const dynamic = 'force-dynamic';

export function GET() {
  const certs = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!certs.length) return new Response('Not configured', { status: 404 });
  return Response.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: PACKAGE, sha256_cert_fingerprints: certs },
  }], { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
