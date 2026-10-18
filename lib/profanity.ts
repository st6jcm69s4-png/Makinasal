// Shared source pattern is also installed as a database trigger; changes require its migration.
export const PROFANITY_WORD = '(?:amk|aq|am[ıi]na[kq]o[ydu][a-zı]*|am[ıi]nakoyim|am[ıi]nakoyayim|siktir[a-zı]*|siker[a-zı]*|sikey[a-zı]*|sikik[a-zı]*|sikmis[a-zı]*|sikmek[a-zı]*|sikicem[a-zı]*|sik|oruspu[a-zı]*|orospu[a-zı]*|pic(?:ler[a-zı]*|lik[a-zı]*|in|sin)?|yarrak[a-zı]*|yarak[a-zı]*|gavat[a-zı]*|ibne[a-zı]*|fuck[a-zı]*|motherfuck[a-zı]*|shit(?:ty|head|s)?|bitch(?:es|ing)?|asshole[a-zı]*|cunt[a-zı]*|dickhead[a-zı]*|bastard[a-zı]*|whore[a-zı]*|serefsiz[a-zı]*|pezevenk[a-zı]*|haysiyetsiz[a-zı]*|gerizekal[iaı][a-zı]*|salak(?:lar[a-zı]*|sin|sın)?|o[cç]|nigg(?:er|a)[a-zı]*|faggot[a-zı]*)';
const words = new RegExp('^(?:' + PROFANITY_WORD + ')$');
export const PROFANITY_ERROR = 'Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle.';
export function profanityTokens(text: string): string[] {
 return text.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
  .replace(/[013457@$]/g, ch => ({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'}[ch]!))
  .replace(/(.)\1{2,}/g, '$1$1').split(/[^a-zı]+/).filter(Boolean);
}
export function containsProfanity(text: string): boolean {
 const tokens = profanityTokens(text);
 if (/(?:^| )am[ıi]na ko[yq][a-zı]*(?:$| )/.test(tokens.join(' '))) return true;
 if (tokens.some(token => words.test(token))) return true;
 // Catch punctuation/space obfuscation only across short tokens; never join ordinary sentences.
 for (let i = 0; i < tokens.length; i++) {
  let joined = '';
  for (let j = i; j < Math.min(tokens.length, i + 14) && tokens[j].length <= 2; j++) {
   joined += tokens[j];
   if (j > i && words.test(joined)) return true;
  }
 }
 return false;
}
