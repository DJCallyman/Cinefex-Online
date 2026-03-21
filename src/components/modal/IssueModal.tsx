import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFocusTrap } from '../../hooks';
import { useArchiveContext } from '../../context/ArchiveContext';
import { COVER_PATH, COVER_FALLBACK } from '../../config';
import { ArticleList } from './ArticleList';
import { ViewOptions } from './ViewOptions';
import { Article } from '../../types';

export function IssueModal() {
    const navigate = useNavigate();
    const params = useParams();
    const issueNumber = parseInt(params.issueId ?? '', 10);

    const { getMagazineByIssue } = useArchiveContext();
    const magazine = getMagazineByIssue(issueNumber);

    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [imgSrc, setImgSrc] = useState(COVER_PATH(issueNumber));
    const [imgError, setImgError] = useState(false);

    const modalRef = useFocusTrap(!!magazine);

    const handleClose = () => {
        navigate('/');
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleSelectArticle = (article: Article) => {
        setSelectedArticle(article);
    };

    const handleBackToArticles = () => {
        setSelectedArticle(null);
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
    }, []);

    if (!magazine) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleOverlayClick}>
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden p-6">
                    <p className="text-white">Issue not found</p>
                    <button onClick={handleClose} className="mt-4 px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const handleImgError = () => {
        if (!imgError) {
            setImgSrc(COVER_FALLBACK(issueNumber));
            setImgError(true);
        }
    };

    return (
        <div
            id="modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div id="modal-overlay" className="modal-overlay absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div
                id="modal-content"
                ref={modalRef}
                className="modal-content relative bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                    aria-label="Close modal"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="w-full md:w-1/2 p-0">
                    <img
                        src={imgSrc}
                        alt={`Cover of Cinefex Issue ${magazine.issue}`}
                        className="w-full h-full object-cover"
                        onError={handleImgError}
                    />
                </div>

                <div id="modal-dynamic-content" className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col">
                    {selectedArticle ? (
                        <ViewOptions magazine={magazine} article={selectedArticle} onBack={handleBackToArticles} />
                    ) : (
                        <ArticleList magazine={magazine} onSelectArticle={handleSelectArticle} />
                    )}
                </div>
            </div>
        </div>
    );
}
