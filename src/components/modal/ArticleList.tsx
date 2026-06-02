import { Magazine, Article } from '../../types';
import { useArchiveContext } from '../../context/ArchiveContext';
import { highlight } from '../../utils/highlight';

interface ArticleListProps {
    magazine: Magazine;
    onSelectArticle: (article: Article, index: number) => void;
}

export function ArticleList({ magazine, onSelectArticle }: ArticleListProps) {
    const { searchQuery } = useArchiveContext();
    const q = searchQuery.trim();

    return (
        <div className="flex-grow overflow-y-auto">
            <span className="text-sm font-semibold text-cyan-400">CINEFEX #{magazine.issue}</span>
            <h2
                id="modal-title"
                className="text-2xl sm:text-3xl font-bold mt-2 mb-4"
                dangerouslySetInnerHTML={{ __html: highlight(magazine.title, q) }}
            />
            <h3 className="font-bold text-lg mb-3 text-gray-200">Articles</h3>
            <div className="space-y-3">
                {magazine.articles.map((article, index) => (
                    <button
                        key={index}
                        className="article-btn w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-white"
                        onClick={() => onSelectArticle(article, index)}
                    >
                        <span
                            className="block"
                            dangerouslySetInnerHTML={{ __html: highlight(article.name, q) }}
                        />
                        {article.articleTitle && (
                            <span
                                className="block text-sm font-normal text-gray-300 mt-1"
                                dangerouslySetInnerHTML={{ __html: highlight(article.articleTitle, q) }}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
