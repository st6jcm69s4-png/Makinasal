import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CAPTCHA_ORIGIN, TURNSTILE_SITE_KEY } from '../lib/auth';

/** Cloudflare Turnstile güvenlik doğrulaması. Başarılı olunca onToken(token), süresi dolunca onToken(null) çağrılır. */
export function Captcha({ onToken }: { onToken: (t: string | null) => void }) {
  const html = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
<style>html,body{margin:0;background:transparent}body{display:flex;justify-content:center;align-items:center;min-height:70px}</style></head>
<body><div id="c"></div><script>
function post(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))}
var t=setInterval(function(){if(window.turnstile){clearInterval(t);window.turnstile.render('#c',{sitekey:${JSON.stringify(TURNSTILE_SITE_KEY)},callback:function(x){post({token:x})},'expired-callback':function(){post({token:null})},'error-callback':function(e){post({token:null,error:String(e)})}})}},100);
</script></body></html>`, []);
  return (
    <View style={s.box}>
      <WebView
        originWhitelist={['*']} source={{ html, baseUrl: CAPTCHA_ORIGIN }} style={s.web} scrollEnabled={false} javaScriptEnabled
        onMessage={(e) => { try { const m = JSON.parse(e.nativeEvent.data) as { token: string | null }; onToken(m.token); } catch { onToken(null); } }}
      />
    </View>
  );
}
const s = StyleSheet.create({ box: { height: 78 }, web: { backgroundColor: 'transparent' } });
