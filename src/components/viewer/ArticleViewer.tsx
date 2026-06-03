import { useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useModalShell } from '../../hooks';
import { useArchiveContext } from '../../context/ArchiveContext';
import { injectStyles, appendImageGalleryToArchival } from '../../services/styleInjection';
import { getArticleNeighbors } from '../../utils/nav';

export function ArticleViewer() {
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();

    const issueNumber = parseInt(searchParams.get('issue') ?? '', 10);
    const articleIndex = parseInt(params.articleIndex ?? '', 10);
    const viewMode = params.viewMode as 'read' | 'archive';

    const { getMagazineByIssue, magazines, setSelectedIssue } = useArchiveContext();
    const magazine = getMagazineByIssue(issueNumber);
    const article = magazine?.articles[articleIndex];

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const prevButtonRef = useRef<HTMLButtonElement>(null);
    const nextButtonRef = useRef<HTMLButtonElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const isReadingView = viewMode === 'read';
    const url = isReadingView ? article?.readingUrl : article?.archiveUrl;

    // Adjacent articles for prev/next navigation, scoped to the whole archive
    const { prev, next } = useMemo(
        () => getArticleNeighbors(magazines, issueNumber, articleIndex),
        [magazines, issueNumber, articleIndex],
    );

    const handleClose = useCallback(() => {
        setSelectedIssue(null);
        navigate('/');
    }, [setSelectedIssue, navigate]);

    const navigateToArticle = useCallback(
        (target: { issue: number; articleIndex: number } | null) => {
            if (!target) return;
            navigate(`/article/${target.articleIndex}/${viewMode}?issue=${target.issue}`);
        },
        [navigate, viewMode],
    );

    const containerRef = useModalShell({
        isOpen: !!magazine && !!article,
        onClose: handleClose,
        initialFocusRef: closeButtonRef,
    });

    const handleIframeLoad = () => {
        setIsLoading(false);
        if (iframeRef.current) {
            injectStyles(iframeRef.current, issueNumber, isReadingView);

            if (!isReadingView && issueNumber > 126) {
                const galleryUrl = article?.imageGalleryUrl;
                if (galleryUrl) {
                    setTimeout(() => {
                        if (iframeRef.current) {
                            appendImageGalleryToArchival(iframeRef.current, galleryUrl);
                        }
                    }, 0);
                }
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
                <div className="text-center text-white max-w-md p-6">
                    <p className="text-xl mb-2">Article not found</p>
                    <p className="text-sm text-gray-400 mb-6">
                        {Number.isFinite(issueNumber) && Number.isFinite(articleIndex)
                            ? `Issue ${issueNumber}, article ${articleIndex + 1} is not in the archive.`
                            : 'The article URL is malformed.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {Number.isFinite(issueNumber) && (
                            <button
                                onClick={() => {
                                    setSelectedIssue(issueNumber);
                                    navigate('/');
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
                            >
                                Back to Issue {issueNumber}
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500 text-white"
                        >
                            Return to Archive
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            id="viewer"
            ref={containerRef}
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
                key={`${issueNumber}-${articleIndex}-${viewMode}`}
                ref={iframeRef}
                src={url}
                className="w-full h-full border-0"
                title={`Article: ${article.name}`}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
            />

            {/* Top-center navigation bar: prev/next article + article title */}
            <div
                className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full pl-2 pr-3 py-1.5 max-w-[calc(100vw-160px)]"
                role="toolbar"
                aria-label="Article navigation"
            >
                <button
                    ref={prevButtonRef}
                    onClick={() => navigateToArticle(prev)}
                    disabled={!prev}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-200 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                    aria-label={prev ? `Previous article: ${prev.articleName} (Issue ${prev.issue})` : 'No previous article'}
                    title={prev ? `← ${prev.articleName} (Issue ${prev.issue})` : 'First article'}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline max-w-[140px] truncate">
                        {prev ? prev.articleName : 'First'}
                    </span>
                </button>
                <span
                    className="text-xs text-cyan-300 border-l border-r border-gray-600 px-3 whitespace-nowrap"
                    aria-live="polite"
                >
                    Issue {issueNumber} · {article.name}
                </span>
                <button
                    ref={nextButtonRef}
                    onClick={() => navigateToArticle(next)}
                    disabled={!next}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-200 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                    aria-label={next ? `Next article: ${next.articleName} (Issue ${next.issue})` : 'No next article'}
                    title={next ? `${next.articleName} (Issue ${next.issue}) →` : 'Last article'}
                >
                    <span className="hidden sm:inline max-w-[140px] truncate">
                        {next ? next.articleName : 'Last'}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

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
