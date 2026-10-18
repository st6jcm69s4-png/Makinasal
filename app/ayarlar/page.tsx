import { pageMetadata } from '@/lib/seo';
import { SettingsView } from '@/components/SettingsView';
export const metadata = pageMetadata('/ayarlar', 'Ayarlar', 'Makinasal · Ayarlar. İş makinesi ve kamyon pazarı.', true);
export default function Page(){return <SettingsView/>;}
