"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "warning" | "info";
type Toast = { id: number; type: ToastType; title: string; msg?: string; leaving?: boolean };
type Notify = (type: ToastType, title: string, msg?: string) => void;

const ToastCtx = createContext<Notify>(() => {});
export const useToast = (): Notify => useContext(ToastCtx);

const ICONS: Record<ToastType, ReactNode> = {
  success: <path d="M20 6 9 17l-5-5" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </>
  ),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);
  useEffect(() => setMounted(true), []);

  const remove = useCallback((id: number) => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setToasts((ts) => ts.filter((t) => t.id !== id));
      return;
    }
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 200);
  }, []);

  const notify = useCallback<Notify>(
    (type, title, msg) => {
      const id = ++idRef.current;
      setToasts((ts) => [...ts.slice(-2), { id, type, title, msg }]);
      if (type !== "error") setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  return (
    <ToastCtx.Provider value={notify}>
      {children}
      {mounted &&
        createPortal(
          <div id="toasts" aria-live="polite">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`toast ${t.type}${t.leaving ? " out" : ""}`}
                role={t.type === "error" ? "alert" : "status"}
              >
                <span className="ti">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {ICONS[t.type]}
                  </svg>
                </span>
                <div className="body">
                  <b>{t.title}</b>
                  {t.msg && <p>{t.msg}</p>}
                </div>
                <button className="x" aria-label="Fermer" onClick={() => remove(t.id)}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 5l14 14M19 5 5 19" />
                  </svg>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastCtx.Provider>
  );
}
