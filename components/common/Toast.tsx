import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { createId } from '../../lib/utils/id';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem { id: string; title: string; detail?: string; tone: ToastTone }
interface ToastApi { show: (title: string, options?: { detail?: string; tone?: ToastTone }) => void }

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const show = useCallback((title: string, options: { detail?: string; tone?: ToastTone } = {}) => {
    const id = createId('toast');
    const item: ToastItem = { id, title, tone: options.tone ?? 'success', ...(options.detail ? { detail: options.detail } : {}) };
    setItems((current) => [...current.slice(-2), item]);
    window.setTimeout(() => dismiss(id), 5200);
  }, [dismiss]);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {items.map((item) => {
          const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'error' ? CircleAlert : Info;
          return (
            <div key={item.id} className={`toast toast--${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={18} />
              <div><strong>{item.title}</strong>{item.detail && <span>{item.detail}</span>}</div>
              <button type="button" className="toast__close" onClick={() => dismiss(item.id)} aria-label="Dismiss"><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}
