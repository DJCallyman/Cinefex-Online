import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

export interface Toast {
    id: number;
    message: string;
    type?: 'info' | 'success' | 'error';
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (message: string, type?: Toast['type']) => void;
    dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_AFTER_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (message: string, type: Toast['type'] = 'info') => {
            const id = ++nextId.current;
            setToasts((prev) => {
                // Cap visible toasts at 3; drop oldest first
                const capped = prev.length >= 3 ? prev.slice(1) : prev;
                return [...capped, { id, message, type }];
            });
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, DISMISS_AFTER_MS);
        },
        [],
    );

    return (
        <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}
