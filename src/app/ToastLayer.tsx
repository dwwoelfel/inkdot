'use client';

import { TOAST_EVENT, type ToastDetail } from '@/lib/toast';
import { useEffect, useState } from 'react';

type ToastItem = ToastDetail & {
  id: number;
};

export function ToastLayer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let nextId = 1;
    const timers = new Map<number, number>();

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      const id = nextId++;
      const durationMs = detail.durationMs ?? 4000;

      setToasts((current) => [...current, { ...detail, id }]);
      timers.set(
        id,
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
          timers.delete(id);
        }, durationMs),
      );
    };

    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:top-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`w-full max-w-md rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-emerald-500/95 text-white'
              : 'border-red-200 bg-red-500/95 text-white'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
