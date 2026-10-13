import { COORDS } from './data/constants';

/** İki şehir merkezi arası kuş uçuşu mesafe (km). */
export function distanceKm(a: string, b: string): number | null {
  const p = COORDS[a], q = COORDS[b];
  if (!p || !q) return null;
  const R = 6371, d = Math.PI / 180;
  const dLat = (q[0] - p[0]) * d, dLon = (q[1] - p[1]) * d;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * d) * Math.cos(q[0] * d) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

export function distanceLabel(from: string, to: string): string {
  const d = distanceKm(from, to);
  if (d == null) return '';
  return d < 10 ? 'Aynı şehir' : `~${(Math.round(d / 5) * 5).toLocaleString('tr-TR')} km`;
}
