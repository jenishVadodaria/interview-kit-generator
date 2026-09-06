'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// --- Types ---
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

// --- Context ---
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// --- Provider ---
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Portal-style overlay fixed to bottom-right */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none print:hidden"
        style={{ maxWidth: '380px', width: '100%' }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// --- Individual Toast Item ---
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Tiny delay to allow CSS transition to play
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      bar: 'bg-emerald-500',
      border: 'border-emerald-500/30',
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
      bar: 'bg-red-500',
      border: 'border-red-500/30',
    },
    info: {
      icon: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
      bar: 'bg-indigo-500',
      border: 'border-indigo-500/30',
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 px-4 py-3.5 rounded-xl bg-slate-900 border ${config.border} shadow-2xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {config.icon}
      <p className="text-sm text-slate-200 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-500 hover:text-white transition-colors ml-1 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
      {/* Shrinking progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] ${config.bar} opacity-60`}
        style={{ animation: 'toast-shrink 4s linear forwards' }}
      />
    </div>
  );
}

// --- Hook ---
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
