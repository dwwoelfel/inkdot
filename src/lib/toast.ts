export type ToastTone = 'error' | 'success';

export type ToastDetail = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

export const TOAST_EVENT = 'inkdot:toast';

export function showToast(detail: ToastDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail }));
}
