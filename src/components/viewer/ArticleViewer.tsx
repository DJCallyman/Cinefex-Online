import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useArchiveContext } from '../../context/ArchiveContext';
import { injectStyles, appendImageGalleryToArchival } from '../../services/styleInjection';

export function ArticleViewer() {
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();

    const issueNumber = parseInt(searchParams.get('issue') ?? '', 10);
    const articleIndex = parseInt(params.articleIndex ?? '', 10);
    const viewMode = params.viewMode as 'read' | 'archive';

    const { getMagazineByIssue, setSelectedIssue } = useArchiveContext();
    const magazine = getMagazineByIssue(issueNumber);
    const article = magazine?.articles[articleIndex];

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const isReadingView = viewMode === 'read';
    const url = isReadingView ? article?.readingUrl : article?.archiveUrl;

    const handleClose = useCallback(() => {
        setSelectedIssue(issueNumber);
        navigate('/');
    }, [setSelectedIssue, issueNumber, navigate]);

    // Focus management: move focus into viewer on open, restore on close
    useEffect(() => {
        previousFocusRef.current = document.activeElement as HTMLElement | null;

        const rafId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        return () => {
            cancelAnimationFrame(rafId);

            const prev = previousFocusRef.current;
            if (prev && typeof prev.focus === 'function') {
                setTimeout(() => {
                    try {
                        prev.focus();
                    } catch {
                        // Element may have been removed from DOM; ignore
                    }
                }, 0);
            } else {
                // Direct URL access or no previous focusable element — fallback
                const fallback =
                    document.getElementById('search-input') ||
                    document.querySelector<HTMLElement>('.magazine-cover') ||
                    document.body;
                if (fallback && typeof fallback.focus === 'function') {
                    setTimeout(() => {
                        try {
                            fallback.focus();
                        } catch {
                            // ignore
                        }
                    }, 0);
                }
            }
            previousFocusRef.current = null;
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleClose]);

    const handleIframeLoad = () => {
        setIsLoading(false);
        if (iframeRef.current) {
            injectStyles(iframeRef.current, issueNumber, isReadingView);

            // Path A (plan): For 127+ Original Layout ("archive"), if we have an imageGalleryUrl,
            // append the gallery photo spreads to the manuscript content after initial styling.
            // This makes "Original Layout" show the full combined magazine experience.
            // Debug logging is gated inside appendImageGalleryToArchival (plan default A).
            if (!isReadingView && issueNumber > 126) {
                const galleryUrl = article?.imageGalleryUrl;
                if (galleryUrl) {
                    // Small delay ensures the base archival styles from injectStyles have applied
                    // before we append more nodes and re-enhance.
                    setTimeout(() => {
                        if (iframeRef.current) {
                            appendImageGalleryToArchival(iframeRef.current, galleryUrl);
                        }
                    }, 0);
                }
                // If no galleryUrl (missing in data or the 5 known missing galleries), we silently
                // degrade to manuscript-only per plan default C. Debug mode will still note it if active.
            }
        }
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    if (!magazine || !article) {
        return (
            <div className="fixed inset-0 z-[60] bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <p className="text-xl mb-4">Article not found</p>
                    <button onClick={() => navigate('/')} className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500">
                        Return to Archive
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            id="viewer"
            className="fixed inset-0 z-[60] bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-label="Article viewer"
        >
            {isLoading && (
                <div className="loading-spinner visible absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {hasError && (
                <div className="load-error absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-xl text-white mb-4">Failed to load article</p>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500 text-white"
                    >
                        Close
                    </button>
                </div>
            )}

            <iframe
                ref={iframeRef}
                src={url}
                className="w-full h-full border-0"
                title={`Article: ${article.name}`}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
            />

            <button
                ref={closeButtonRef}
                onClick={handleClose}
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
