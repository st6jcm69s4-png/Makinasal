import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { color as theme } from '../lib/theme';

export type IconName = keyof typeof Feather.glyphMap;
type FeatherName = IconName;
/** Tek çizgi kalınlığında Feather simgeleri. */
export function Icon({ name, size = 22, color = theme.ink }: { name: FeatherName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}
/** Favori kalbi (dolu / boş). */
export function Heart({ on, size = 22, color }: { on: boolean; size?: number; color: string }) {
  return <MaterialCommunityIcons name={on ? 'heart' : 'heart-outline'} size={size} color={color} />;
}
