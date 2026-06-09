import { useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useModalShell } from '../../hooks';
import { useArchiveContext } from '../../context/ArchiveContext';
import { injectStyles, appendImageGalleryToArchival } from '../../services/styleInjection';
import { getArticleNeighbors } from '../../utils/nav';
import { ViewerShell } from './ViewerShell';

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
        if (!iframeRef.current) return;
        injectStyles(iframeRef.current, issueNumber, isReadingView);

        if (!isReadingView && issueNumber > 126) {
            const galleryUrl = article?.imageGalleryUrl;
            if (galleryUrl) {
                appendImageGalleryToArchival(iframeRef.current, galleryUrl);
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
        <ViewerShell
            containerRef={containerRef}
            ariaLabel="Article viewer"
            toolbarRoleLabel="Article navigation"
            toolbarLabel={`Issue ${issueNumber} · ${article.name}`}
            closeButtonRef={closeButtonRef}
            onClose={handleClose}
            prev={
                prev
                    ? {
                          label: prev.articleName,
                          ariaLabel: `Previous article: ${prev.articleName} (Issue ${prev.issue})`,
                          title: `← ${prev.articleName} (Issue ${prev.issue})`,
                          onClick: () => navigateToArticle(prev),
                      }
                    : null
            }
            next={
                next
                    ? {
                          label: next.articleName,
                          ariaLabel: `Next article: ${next.articleName} (Issue ${next.issue})`,
                          title: `${next.articleName} (Issue ${next.issue}) →`,
                          onClick: () => navigateToArticle(next),
                      }
                    : null
            }
            prevFallback="First"
            nextFallback="Last"
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
        </ViewerShell>
    );
}
