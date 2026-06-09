import { RefObject, ReactNode } from 'react';

export interface ViewerNav {
    label: string;
    ariaLabel: string;
    title?: string;
    onClick: () => void;
}

interface ViewerShellProps {
    containerRef: RefObject<HTMLDivElement | null>;
    ariaLabel: string;
    toolbarLabel: ReactNode;
    toolbarRoleLabel?: string;
    prev?: ViewerNav | null;
    next?: ViewerNav | null;
    prevFallback?: string;
    nextFallback?: string;
    onClose: () => void;
    closeButtonRef?: RefObject<HTMLButtonElement | null>;
    children: ReactNode;
}

/**
 * Shared chrome for the fullscreen viewer route: outer #viewer wrapper,
 * the top-center toolbar (prev/next + label), and the close button. Owns no
 * state — the parent supplies nav callbacks and the iframe slot as children.
 *
 * Extracted from ArticleViewer so FullIssueViewer can render the same
 * shell while iterating across issues rather than articles.
 */
export function ViewerShell({
    containerRef,
    ariaLabel,
    toolbarLabel,
    toolbarRoleLabel,
    prev,
    next,
    prevFallback,
    nextFallback,
    onClose,
    closeButtonRef,
    children,
}: ViewerShellProps) {
    return (
        <div
            id="viewer"
            ref={containerRef}
            className="fixed inset-0 z-[60] bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
        >
            {children}

            <div
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full pl-2 pr-3 py-1.5 max-w-[calc(100vw-160px)]"
                role="toolbar"
                aria-label={toolbarRoleLabel ?? 'Viewer navigation'}
            >
                <button
                    onClick={prev?.onClick}
                    disabled={!prev}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-200 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                    aria-label={prev?.ariaLabel ?? 'No previous'}
                    title={prev?.title ?? prevFallback}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline max-w-[140px] truncate">
                        {prev ? prev.label : prevFallback ?? ''}
                    </span>
                </button>
                <span
                    className="text-xs text-cyan-300 border-l border-r border-gray-600 px-3 whitespace-nowrap"
                    aria-live="polite"
                >
                    {toolbarLabel}
                </span>
                <button
                    onClick={next?.onClick}
                    disabled={!next}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-200 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                    aria-label={next?.ariaLabel ?? 'No next'}
                    title={next?.title ?? nextFallback}
                >
                    <span className="hidden sm:inline max-w-[140px] truncate">
                        {next ? next.label : nextFallback ?? ''}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <button
                ref={closeButtonRef}
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-300 hover:text-white bg-black/50 rounded-full p-2 transition-colors"
                aria-label="Close viewer"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
