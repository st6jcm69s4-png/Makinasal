import { useEffect, type MutableRefObject } from 'react';

// Alt sekmeye basılınca o sekmedeki liste en başa kayar.
const fns = new Map<string, () => void>();
type Scrollable = { scrollTo?: (o: { y: number; animated: boolean }) => void; scrollToOffset?: (o: { offset: number; animated: boolean }) => void } | null;

export function useTabScrollTop(name: string, ref: MutableRefObject<Scrollable>) {
  useEffect(() => {
    fns.set(name, () => {
      const r = ref.current;
      if (r?.scrollToOffset) r.scrollToOffset({ offset: 0, animated: true });
      else r?.scrollTo?.({ y: 0, animated: true });
    });
    return () => { fns.delete(name); };
  }, [name, ref]);
}
export const fireScrollTop = (name: string) => fns.get(name)?.();
