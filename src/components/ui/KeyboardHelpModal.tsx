import { useEffect, useRef } from 'react';

interface ShortcutRow {
    key: string;
    description: string;
}

const SHORTCUTS: ShortcutRow[] = [
    { key: '/', description: 'Focus search' },
    { key: 'g g', description: 'Jump to year navigation' },
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: '←  →', description: 'Previous / next article (in viewer)' },
    { key: 'Esc', description: 'Close modal or viewer' },
];

interface KeyboardHelpModalProps {
    onClose: () => void;
}

export function KeyboardHelpModal({ onClose }: KeyboardHelpModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Focus close button on open
    useEffect(() => {
        closeBtnRef.current?.focus();
    }, []);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[150] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" />

            {/* Panel */}
            <div className="relative bg-gray-800 rounded-xl shadow-2xl border border-gray-600 p-6 w-full max-w-sm mx-4">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                    <button
                        ref={closeBtnRef}
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Close keyboard shortcuts"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="text-left text-xs text-gray-400 uppercase tracking-wide pb-2 pr-4">Key</th>
                            <th className="text-left text-xs text-gray-400 uppercase tracking-wide pb-2">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {SHORTCUTS.map(({ key, description }) => (
                            <tr key={key}>
                                <td className="py-2.5 pr-4">
                                    <kbd className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-gray-700 border border-gray-500 text-cyan-300 whitespace-nowrap">
                                        {key}
                                    </kbd>
                                </td>
                                <td className="py-2.5 text-gray-200">{description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-4 text-xs text-gray-500 text-center">
                    Press <kbd className="px-1 py-0.5 rounded text-xs font-mono bg-gray-700 border border-gray-600 text-gray-400">?</kbd> anytime to show this
                </p>
            </div>
        </div>
    );
}
