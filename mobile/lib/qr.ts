/**
 * Küçük QR kod üretici (ek paket gerektirmez): bayt kipi, hata düzeltme M, sürüm 1-9 (en çok 180 bayt).
 * İlan bağlantısı gibi kısa adresler içindir. Dönen değer: true = koyu kare.
 */
type Spec = { ec: number; blocks: [number, number][]; align: number[]; ver?: number };
const SPECS: Spec[] = [
  { ec: 10, blocks: [[1, 16]], align: [] },
  { ec: 16, blocks: [[1, 28]], align: [6, 18] },
  { ec: 26, blocks: [[1, 44]], align: [6, 22] },
  { ec: 18, blocks: [[2, 32]], align: [6, 26] },
  { ec: 24, blocks: [[2, 43]], align: [6, 30] },
  { ec: 16, blocks: [[4, 27]], align: [6, 34] },
  { ec: 18, blocks: [[4, 31]], align: [6, 22, 38], ver: 0x07c94 },
  { ec: 22, blocks: [[2, 38], [2, 39]], align: [6, 24, 42], ver: 0x085bc },
  { ec: 22, blocks: [[3, 36], [2, 37]], align: [6, 26, 46], ver: 0x09a99 },
];

// GF(256) tabloları (x^8 + x^4 + x^3 + x^2 + 1)
const EXP: number[] = [], LOG: number[] = [];
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function ecBytes(data: number[], n: number): number[] {
  let gen = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) { next[j] ^= gen[j]; next[j + 1] ^= mul(gen[j], EXP[i]); }
    gen = next;
  }
  const rem = new Array<number>(n).fill(0);
  for (const d of data) {
    const f = d ^ rem[0];
    rem.shift(); rem.push(0);
    for (let j = 0; j < n; j++) rem[j] ^= mul(gen[j + 1], f);
  }
  return rem;
}

function utf8(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 63;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

export function qrMatrix(text: string): boolean[][] | null {
  const bytes = utf8(text);
  const vi = SPECS.findIndex((sp) => sp.blocks.reduce((a, [c, d]) => a + c * d, 0) - 2 >= bytes.length);
  if (vi < 0) return null;
  const spec = SPECS[vi], version = vi + 1, size = 17 + version * 4;
  const dataLen = spec.blocks.reduce((a, [c, d]) => a + c * d, 0);

  // Veri bitleri: kip (0100), uzunluk (8 bit), baytlar, sonlandırıcı, dolgu
  const bits: number[] = [];
  const put = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(4, 4); put(bytes.length, 8);
  for (const b of bytes) put(b, 8);
  for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < dataLen; pad ^= 0xec ^ 0x11) data.push(pad);

  // Bloklara böl, hata düzeltme ekle, iç içe sırala
  const dBlocks: number[][] = [], eBlocks: number[][] = [];
  let pos = 0;
  for (const [count, len] of spec.blocks) for (let i = 0; i < count; i++) {
    const d = data.slice(pos, pos + len); pos += len;
    dBlocks.push(d); eBlocks.push(ecBytes(d, spec.ec));
  }
  const stream: number[] = [];
  const maxD = Math.max(...dBlocks.map((b) => b.length));
  for (let i = 0; i < maxD; i++) for (const b of dBlocks) if (i < b.length) stream.push(b[i]);
  for (let i = 0; i < spec.ec; i++) for (const b of eBlocks) stream.push(b[i]);

  // Matris ve ayrılmış (işlev) kareler
  const m: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (r: number, c: number, v: boolean) => { if (r >= 0 && c >= 0 && r < size && c < size) { m[r][c] = v; fn[r][c] = true; } };
  const finder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dark = inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      set(r0 + r, c0 + c, dark);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (const r of spec.align) for (const c of spec.align) {
    if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }
  for (let i = 8; i < size - 8; i++) { if (!fn[6][i]) set(6, i, i % 2 === 0); if (!fn[i][6]) set(i, 6, i % 2 === 0); }
  set(size - 8, 8, true); // sabit koyu kare
  // Biçim bilgisi alanlarını ayır (değerler aşağıda yazılır)
  for (let i = 0; i <= 8; i++) { if (!fn[8][i]) set(8, i, false); if (!fn[i][8]) set(i, 8, false); }
  for (let i = 0; i < 8; i++) { set(8, size - 1 - i, false); if (i < 7) set(size - 1 - i, 8, false); }
  set(size - 8, 8, true);
  if (spec.ver !== undefined) {
    for (let i = 0; i < 18; i++) {
      const bit = ((spec.ver >> i) & 1) === 1;
      set(Math.floor(i / 3), size - 11 + (i % 3), bit);
      set(size - 11 + (i % 3), Math.floor(i / 3), bit);
    }
  }

  // Veriyi zikzak yerleştir, maske 0 ((satır + sütun) çift) uygula
  let bi = 0;
  const total = stream.length * 8;
  for (let col = size - 1, up = true; col > 0; col -= 2, up = !up) {
    if (col === 6) col--;
    for (let k = 0; k < size; k++) {
      const r = up ? size - 1 - k : k;
      for (const c of [col, col - 1]) {
        if (fn[r][c]) continue;
        const bit = bi < total ? ((stream[bi >> 3] >> (7 - (bi & 7))) & 1) === 1 : false;
        bi++;
        m[r][c] = bit !== ((r + c) % 2 === 0);
      }
    }
  }

  // Biçim bilgisi: düzey M (00), maske 0 → BCH(15,5), 0x5412 ile XOR
  let f = 0;
  let rem = f << 10;
  for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  f = ((f << 10) | rem) ^ 0x5412;
  const fb = (i: number) => ((f >> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) m[8][i] = fb(14 - i);
  m[8][7] = fb(8); m[8][8] = fb(7); m[7][8] = fb(6);
  for (let i = 0; i <= 5; i++) m[5 - i][8] = fb(5 - i);
  for (let i = 0; i < 7; i++) m[size - 1 - i][8] = fb(14 - i);
  for (let i = 0; i < 8; i++) m[8][size - 8 + i] = fb(7 - i);
  return m;
}
