import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Icon } from './Icon';
import { Text } from './LText';
import { color, radius, shadow, fixed } from '../lib/theme';

/** Uygulama içinde video oynatır (yüklenen mp4/mov). Dokununca yüklenir, veri harcamasın. */
export function VideoPlayer({ uri, poster }: { uri: string; poster?: string | null }) {
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;object-fit:contain;background:#000}</style></head>
<body><video src="${esc(uri)}"${poster ? ` poster="${esc(poster)}"` : ''} controls autoplay playsinline webkit-playsinline preload="metadata"></video></body></html>`;
  return (
    <View style={s.box}>
      {on ? (
        <>
          <WebView
            source={{ html }}
            style={s.web}
            originWhitelist={['*']}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            javaScriptEnabled={false}
            onLoadEnd={() => setLoading(false)}
            setSupportMultipleWindows={false}
          />
          {loading ? <View style={s.center} pointerEvents="none"><ActivityIndicator color={fixed.onMedia} /></View> : null}
        </>
      ) : (
        <Pressable style={({ pressed }) => [s.center, pressed && { opacity: 0.85 }]} onPress={() => setOn(true)} accessibilityRole="button" accessibilityLabel="Videoyu oynat">
          <View style={s.play}><Icon name="play" size={28} color={fixed.onMedia} /></View>
          <Text style={s.t}>Videoyu oynat</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginHorizontal: 16, height: 220, borderRadius: radius + 4, overflow: 'hidden', backgroundColor: fixed.mediaBg, ...shadow },
  web: { flex: 1, backgroundColor: fixed.black },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10 },
  play: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  t: { color: fixed.onMedia, fontSize: 14.5 },
});
