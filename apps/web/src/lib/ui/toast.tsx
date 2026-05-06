'use client';

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { cn } from '../cn';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { ring: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { ring: 'ring-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2 },
  error: { ring: 'ring-red-200 bg-red-50 text-red-900', icon: AlertTriangle },
  info: { ring: 'ring-sky-200 bg-sky-50 text-sky-900', icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      counter.current += 1;
      const id = `t-${Date.now()}-${counter.current}`;
      setToasts((prev) => [...prev, { id, ...t }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push({ title, description, variant: 'success' }),
      error: (title, description) => push({ title, description, variant: 'error' }),
      info: (title, description) => push({ title, description, variant: 'info' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed top-4 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => {
          const Spec = VARIANT_STYLES[t.variant];
          const Icon = Spec.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg p-3 shadow-lg ring-1',
                Spec.ring,
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.description ? (
                  <div className="mt-0.5 text-xs opacity-80">{t.description}</div>
                ) : null}
              </div>
              <button
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded p-1 hover:bg-black/5"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
