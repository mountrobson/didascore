import { createStore } from '../lib/store';

export interface Toast { id: number; title: string; body: string }
const toastStore = createStore<{ list: Toast[] }>('dida.toasts.mem', { list: [] }, false);
let n = 0;

export function pushToast(title: string, body: string) {
  const id = ++n;
  toastStore.set((s) => ({ list: [...s.list.slice(-2), { id, title, body }] }));
  window.setTimeout(() => toastStore.set((s) => ({ list: s.list.filter((t) => t.id !== id) })), 6000);
}

export function Toasts() {
  const { list } = toastStore.use();
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast">
          <strong>{t.title}</strong>
          <span>{t.body}</span>
        </div>
      ))}
    </div>
  );
}
