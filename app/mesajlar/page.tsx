import { Inbox } from '@/components/Inbox';

export const metadata = { title: 'Mesajlar | Makinasal' };

export default function MessagesPage() {
  return (
    <>
      <h1>Mesajlar</h1>
      <Inbox />
    </>
  );
}
