export type MessageCursor = { id: string; created_at: string };
export const MESSAGE_PAGE_SIZE = 50;
/** UUID and Postgres timestamp only; never put user text into an .or expression. */
export function olderMessagesFilter(cursor: MessageCursor): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.created_at) ||
      !Number.isFinite(Date.parse(cursor.created_at))) throw new Error('Geçersiz mesaj konumu');
  return `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
}
/** Preserve timestamp microseconds and use UUID to order messages with equal dates. */
export function messageOrder(a: MessageCursor, b: MessageCursor): number {
  const date = Date.parse(a.created_at) - Date.parse(b.created_at);
  if (date) return date;
  const micros = (value: string) => (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0').slice(0, 6);
  return micros(a.created_at).localeCompare(micros(b.created_at)) || a.id.localeCompare(b.id);
}
export function mergeMessages<T extends MessageCursor>(current: T[], incoming: T[]): T[] {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(messageOrder);
}
