import { useNavigate } from 'react-router-dom';
import { Magazine, Article } from '../../types';
import { useArchiveContext } from '../../context/ArchiveContext';

interface ViewOptionsProps {
    magazine: Magazine;
    article: Article;
    articleIndex: number;
    onBack: () => void;
}

export function ViewOptions({ magazine, article, articleIndex, onBack }: ViewOptionsProps) {
    const navigate = useNavigate();
    const { setSelectedIssue } = useArchiveContext();

    const handleReadOnline = () => {
        setSelectedIssue(null);
        navigate(`/article/${articleIndex}/read?issue=${magazine.issue}`);
    };

    const handleViewLayout = () => {
        setSelectedIssue(null);
        navigate(`/article/${articleIndex}/archive?issue=${magazine.issue}`);
    };

    return (
        <div className="flex-grow">
            <button onClick={onBack} className="text-sm text-cyan-400 hover:text-cyan-300 mb-4 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Article List
            </button>
            <span className="text-sm font-semibold text-cyan-400">CINEFEX #{magazine.issue}</span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2">{article.name}</h2>
            {article.articleTitle && <p className="text-lg text-gray-300 mt-1 mb-4">{article.articleTitle}</p>}
            <p className="text-gray-300 leading-relaxed mb-6">Select a format to view the article.</p>
            <div className="mt-auto flex flex-col sm:flex-row gap-4">
                <button
                    onClick={handleReadOnline}
                    className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-md font-semibold transition-colors text-white"
                >
                    Read Online
                </button>
                <button
                    onClick={handleViewLayout}
                    className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold transition-colors text-white"
                >
                    View Original Layout
                </button>
            </div>
        </div>
    );
}
