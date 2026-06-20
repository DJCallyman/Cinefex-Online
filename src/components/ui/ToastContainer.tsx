import { useToast } from '../../context/ToastContext';

export function ToastContainer() {
    const { toasts, dismissToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
            aria-live="polite"
            aria-label="Notifications"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="toast-enter flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg pointer-events-auto bg-gray-800 border border-gray-600 text-white text-sm max-w-xs"
                    role="status"
                >
                    <span className="flex-1">{toast.message}</span>
                    <button
                        onClick={() => dismissToast(toast.id)}
                        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        aria-label="Dismiss notification"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
