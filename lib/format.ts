export const formatTL = (n: number) => `${Number(n).toLocaleString('tr-TR')} ₺`;
export const formatNum = (n: number) => Number(n).toLocaleString('tr-TR');
export const formatScore = (x: number | null | undefined) => (x == null ? '–' : x.toFixed(1).replace('.', ','));
