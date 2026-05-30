import { Magazine, Article } from '../../types';

interface ArticleListProps {
    magazine: Magazine;
    onSelectArticle: (article: Article, index: number) => void;
}

export function ArticleList({ magazine, onSelectArticle }: ArticleListProps) {
    return (
        <div className="flex-grow overflow-y-auto">
            <span className="text-sm font-semibold text-cyan-400">CINEFEX #{magazine.issue}</span>
            <h2 id="modal-title" className="text-2xl sm:text-3xl font-bold mt-2 mb-4">
                {magazine.title}
            </h2>
            <h3 className="font-bold text-lg mb-3 text-gray-200">Articles</h3>
            <div className="space-y-3">
                {magazine.articles.map((article, index) => (
                    <button
                        key={index}
                        className="article-btn w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-white"
                        onClick={() => onSelectArticle(article, index)}
                    >
                        {article.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
