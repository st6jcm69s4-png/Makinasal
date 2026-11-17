// iPhone "evrensel bağlantı" dosyası: makinasal.com/ilanlar/… gibi bağlantılar uygulama yüklüyse uygulamada açılır.
// APPLE_TEAM_ID (Apple Developer üyeliğindeki Team ID) Vercel ortam değişkenine girilince etkinleşir.
const BUNDLE_ID = 'tr.com.makinasal.app';

export const dynamic = 'force-dynamic';

export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  if (!team) return new Response('Not configured', { status: 404 });
  const body = {
    applinks: {
      details: [{
        appIDs: [`${team}.${BUNDLE_ID}`],
        components: [
          { '/': '/ilanlar/*' },
          { '/': '/magaza/*' },
          { '/': '/firmalar/*' },
          { '/': '/is-agi/ilan/*' },
        ],
      }],
    },
  };
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
