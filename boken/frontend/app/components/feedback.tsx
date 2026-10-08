"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, X, AlertTriangle } from "lucide-react";

type Tone = "default" | "success" | "error";

type Toast = { id: number; message: string; tone: Tone };

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type FeedbackContextValue = {
  toast: (message: string, tone?: Tone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const counter = useRef(0);

  const toast = useCallback((message: string, tone: Tone = "default") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setDialog(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  }, []);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[70] flex flex-col items-center gap-2 px-4 md:bottom-8"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-sm animate-rise items-center gap-3 rounded-full bg-ink py-2.5 pl-3 pr-5 text-sm font-medium text-paper shadow-[0_10px_30px_-10px_rgb(0_0_0/0.45)]"
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                t.tone === "error" ? "bg-seal text-sheet" : t.tone === "success" ? "bg-jade text-sheet" : "bg-paper/15"
              }`}
            >
              {t.tone === "error" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </span>
            {t.message}
          </div>
        ))}
      </div>

      {dialog && <ConfirmDialog options={dialog} onClose={close} />}
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (value: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={() => onClose(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm animate-rise rounded-panel border border-line bg-sheet p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {options.danger && (
          <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-seal/10 text-seal">
            <AlertTriangle className="h-5 w-5" />
          </span>
        )}
        <h2 id="confirm-title" className="text-lg font-semibold">
          {options.title}
        </h2>
        {options.body && <p className="mt-1.5 text-sm leading-relaxed text-muted">{options.body}</p>}
        <div className="mt-6 flex gap-2">
          <button
            className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-paper"
            onClick={() => onClose(false)}
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-sheet transition-opacity hover:opacity-90 ${
              options.danger ? "bg-seal" : "bg-ink"
            }`}
            onClick={() => onClose(true)}
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
}
