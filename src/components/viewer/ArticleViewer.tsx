import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useArchiveContext } from '../../context/ArchiveContext';
import { injectStyles } from '../../services/styleInjection';

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
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const isReadingView = viewMode === 'read';
    const url = isReadingView ? article?.readingUrl : article?.archiveUrl;

    const handleClose = () => {
        setSelectedIssue(issueNumber);
        navigate('/');
    };

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
