import { Magazine, Article } from '../../types';
import { useArchiveContext } from '../../context/ArchiveContext';
import { highlight } from '../../utils/highlight';
import { displayTitle } from '../../utils/articleDisplay';

interface ArticleListProps {
    magazine: Magazine;
    onSelectArticle: (article: Article, index: number) => void;
    onViewFullIssue: () => void;
}

export function ArticleList({ magazine, onSelectArticle, onViewFullIssue }: ArticleListProps) {
    const { searchQuery } = useArchiveContext();
    const q = searchQuery.trim();

    return (
        <div className="flex-grow overflow-y-auto">
            <span
                id="modal-title"
                className="text-sm font-semibold text-cyan-400"
            >
                CINEFEX #{magazine.issue}
            </span>
            <h3 className="font-bold text-lg mt-2 mb-3 text-gray-200">Articles</h3>
            <div className="space-y-3">
                {magazine.articles.map((article, index) => {
                    const subtitle = displayTitle(article.name, article.articleTitle);
                    return (
                        <button
                            key={index}
                            className="article-btn w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-white"
                            onClick={() => onSelectArticle(article, index)}
                        >
                            <span
                                className="block"
                                dangerouslySetInnerHTML={{ __html: highlight(article.name, q) }}
                            />
                            {subtitle && (
                                <span
                                    className="block text-sm font-normal text-gray-300 mt-1"
                                    dangerouslySetInnerHTML={{ __html: highlight(subtitle, q) }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
            <button
                type="button"
                data-testid="view-full-issue"
                onClick={onViewFullIssue}
                className="mt-4 w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-md font-semibold transition-colors text-white flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                View Full Issue (Original Layout)
            </button>
        </div>
    );
}
