import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModalShell } from '../../hooks';
import { useArchiveContext } from '../../context/ArchiveContext';
import { COVER_FALLBACK } from '../../config';
import { getIssueNeighbors } from '../../utils/nav';
import { ArticleList } from './ArticleList';
import { ViewOptions } from './ViewOptions';
import { Cover } from '../archive';
import { Article } from '../../types';

interface IssueModalProps {
    issueNumber: number;
}

export function IssueModal({ issueNumber }: IssueModalProps) {
    const { getMagazineByIssue, magazines, setSelectedIssue } = useArchiveContext();
    const navigate = useNavigate();
    const magazine = getMagazineByIssue(issueNumber);

    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [selectedArticleIndex, setSelectedArticleIndex] = useState<number | null>(null);
    const [imgError, setImgError] = useState(false);

    const handleClose = useCallback(() => {
        setSelectedIssue(null);
    }, [setSelectedIssue]);

    const modalRef = useModalShell({ isOpen: !!magazine, onClose: handleClose });

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleSelectArticle = (article: Article, index: number) => {
        setSelectedArticle(article);
        setSelectedArticleIndex(index);
    };

    const handleBackToArticles = () => {
        setSelectedArticle(null);
        setSelectedArticleIndex(null);
    };

    const handleViewFullIssue = useCallback(() => {
        setSelectedIssue(null);
        navigate(`/issue/${issueNumber}/full`);
    }, [navigate, setSelectedIssue, issueNumber]);

    // Reset inner state whenever the modal is opened for a new issue
    useEffect(() => {
        setSelectedArticle(null);
        setSelectedArticleIndex(null);
        setImgError(false);
    }, [issueNumber]);

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

    const { prev: prevIssue, next: nextIssue } = getIssueNeighbors(magazines, issueNumber);

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
                className="modal-content relative bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl aspect-[2/1] max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
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
                    <Cover
                        issue={magazine.issue}
                        alt={`Cover of Cinefex Issue ${magazine.issue}`}
                        className="w-full h-full object-cover"
                        fallback={imgError ? COVER_FALLBACK(magazine.issue) : undefined}
                        onError={() => setImgError(true)}
                        loading="eager"
                    />
                </div>

                <div id="modal-dynamic-content" className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col">
                    {selectedArticle && selectedArticleIndex !== null ? (
                        <ViewOptions
                            magazine={magazine}
                            article={selectedArticle}
                            articleIndex={selectedArticleIndex}
                            onBack={handleBackToArticles}
                        />
                    ) : (
                        <ArticleList
                            magazine={magazine}
                            onSelectArticle={handleSelectArticle}
                            onViewFullIssue={handleViewFullIssue}
                        />
                    )}

                    {(prevIssue !== null || nextIssue !== null) && (
                        <nav
                            className="mt-6 pt-4 border-t border-gray-700 flex justify-between gap-2"
                            aria-label="Navigate to adjacent issues"
                        >
                            <button
                                onClick={() => prevIssue !== null && setSelectedIssue(prevIssue)}
                                disabled={prevIssue === null}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-cyan-400 hover:text-cyan-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                aria-label={prevIssue !== null ? `Go to Issue ${prevIssue}` : 'No previous issue'}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                {prevIssue !== null ? `Issue ${prevIssue}` : 'First issue'}
                            </button>
                            <button
                                onClick={() => nextIssue !== null && setSelectedIssue(nextIssue)}
                                disabled={nextIssue === null}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-cyan-400 hover:text-cyan-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                aria-label={nextIssue !== null ? `Go to Issue ${nextIssue}` : 'No next issue'}
                            >
                                {nextIssue !== null ? `Issue ${nextIssue}` : 'Last issue'}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </nav>
                    )}
                </div>
            </div>
        </div>
    );
}
