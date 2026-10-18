import {pageMetadata} from '@/lib/seo';
import {NotificationsView} from '@/components/NotificationsView';
export const metadata=pageMetadata('/bildirimler','Bildirimler','Mesajlar, kayıtlı aramalar ve fiyat değişiklikleri.',true);
export default function Page(){return <NotificationsView/>;}
