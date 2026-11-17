import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { color as theme } from '../lib/theme';

export type IconName = keyof typeof Feather.glyphMap;
type FeatherName = IconName;
/** Tek çizgi kalınlığında Feather simgeleri. */
export function Icon({ name, size = 22, color = theme.ink }: { name: FeatherName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}
/** İş makinesi simgesi (ekskavatör): Feather'da yok, Material Community setinden. */
export function ExcavatorIcon({ size = 22, color = theme.ink }: { size?: number; color?: string }) {
  return <MaterialCommunityIcons name="excavator" size={size} color={color} />;
}
/** Feather simgesi ya da 'excavator'. */
export type AnyIconName = IconName | 'excavator';
export function AnyIcon({ name, size = 22, color = theme.ink }: { name: AnyIconName; size?: number; color?: string }) {
  return name === 'excavator' ? <ExcavatorIcon size={size} color={color} /> : <Icon name={name} size={size} color={color} />;
}
/** Favori kalbi (dolu / boş). */
export function Heart({ on, size = 22, color }: { on: boolean; size?: number; color: string }) {
  return <MaterialCommunityIcons name={on ? 'heart' : 'heart-outline'} size={size} color={color} />;
}
