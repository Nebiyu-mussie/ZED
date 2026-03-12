import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: string; title: string; description?: string; variant?: 'success' | 'error' | 'info' };

type ToastContextValue = {
  push: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-6 top-20 z-[100] space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[240px] rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
              toast.variant === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : toast.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div className="font-semibold">{toast.title}</div>
            {toast.description ? <div className="text-xs text-slate-500">{toast.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

