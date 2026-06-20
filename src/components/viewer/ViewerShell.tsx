import { RefObject, ReactNode } from 'react';
import { FontSize } from '../../hooks/useFontSize';

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
    /** Viewer-specific extras (article viewer only) */
    viewMode?: string;
    fontSize?: FontSize;
    onFontSizeChange?: (size: FontSize) => void;
    splitView?: boolean;
    onToggleSplitView?: () => void;
    onToggleGallery?: () => void;
}

const FONT_LABELS: Record<FontSize, string> = { small: 'A−', medium: 'A', large: 'A+' };
const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];

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
    viewMode,
    fontSize,
    onFontSizeChange,
    splitView,
    onToggleSplitView,
    onToggleGallery,
}: ViewerShellProps) {
    const isReadingView = viewMode === 'read';
    const isGallery = viewMode === 'gallery';
    const showFontSizeControls = isReadingView && !!fontSize && !!onFontSizeChange;
    const showGalleryToggle = !!onToggleGallery;
    const showSplitToggle = !!onToggleSplitView && !isGallery;

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

                {/* Font size controls — reading view only */}
                {showFontSizeControls && (
                    <div className="flex items-center border-l border-gray-600 pl-2 gap-0.5">
                        {FONT_SIZES.map((size) => (
                            <button
                                key={size}
                                onClick={() => onFontSizeChange!(size)}
                                className={
                                    'px-1.5 py-1 text-xs rounded transition-colors ' +
                                    (fontSize === size
                                        ? 'text-cyan-300 font-semibold'
                                        : 'text-gray-400 hover:text-white')
                                }
                                aria-label={`Font size: ${size}`}
                                aria-pressed={fontSize === size}
                                title={`Font size: ${size}`}
                            >
                                {FONT_LABELS[size]}
                            </button>
                        ))}
                    </div>
                )}

                {/* Gallery toggle */}
                {showGalleryToggle && (
                    <button
                        onClick={onToggleGallery}
                        className={
                            'border-l border-gray-600 pl-2 px-2 py-1 text-xs transition-colors ' +
                            (isGallery ? 'text-cyan-300' : 'text-gray-400 hover:text-white')
                        }
                        aria-label={isGallery ? 'Exit gallery mode' : 'View image gallery'}
                        aria-pressed={isGallery}
                        title={isGallery ? 'Exit gallery' : 'Gallery'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                )}

                {/* Split view toggle — desktop only (hidden below lg) */}
                {showSplitToggle && (
                    <button
                        onClick={onToggleSplitView}
                        className={
                            'hidden lg:flex border-l border-gray-600 pl-2 px-2 py-1 text-xs transition-colors items-center ' +
                            (splitView ? 'text-cyan-300' : 'text-gray-400 hover:text-white')
                        }
                        aria-label={splitView ? 'Exit split view' : 'Split view: reading + original layout'}
                        aria-pressed={splitView}
                        title={splitView ? 'Exit split' : 'Split view'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                        </svg>
                    </button>
                )}
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
