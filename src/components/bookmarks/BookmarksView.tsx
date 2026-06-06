import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useArchiveContext } from '../../context/ArchiveContext';
import { useBookmarks } from '../../context/BookmarksContext';
import { Magazine } from '../../types';
import { Cover } from '../archive/Cover';
import { displayTitle } from '../../utils/articleDisplay';

export function BookmarksView() {
    const { magazines, isLoading } = useArchiveContext();
    const { bookmarks, clearAll } = useBookmarks();

    // Join bookmark entries back to their source magazine to render full cards.
    // Articles missing from the data (e.g. removed issues) are still listed
    // individually below so the user can manage their saves.
    const { matched, unmatched } = useMemo(() => {
        const byIssue = new Map<number, (typeof magazines)[number]>();
        for (const m of magazines) byIssue.set(m.issue, m);

        const matched: { bookmark: (typeof bookmarks)[number]; magazine: (typeof magazines)[number]; articleIndex: number }[] = [];
        const unmatched: (typeof bookmarks)[number][] = [];

        for (const b of bookmarks) {
            const mag = byIssue.get(b.issue);
            if (mag && mag.articles[b.articleIndex]) {
                matched.push({ bookmark: b, magazine: mag, articleIndex: b.articleIndex });
            } else {
                unmatched.push(b);
            }
        }
        return { matched, unmatched };
    }, [magazines, bookmarks]);

    if (isLoading) {
        return (
            <p className="text-center text-gray-300" role="status" aria-live="polite">
                Loading archive...
            </p>
        );
    }

    if (bookmarks.length === 0) {
        return (
            <div className="text-center py-16 max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-3">No saved articles yet</h1>
                <p className="text-gray-300 mb-6">
                    Tap the star on any issue cover to save it for later. Your bookmarks live in
                    this browser only — no account required.
                </p>
                <Link
                    to="/"
                    className="inline-block px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md font-semibold text-white transition-colors"
                >
                    Browse the archive
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-baseline justify-between mb-6">
                <h1 className="text-3xl font-bold text-white">Saved articles</h1>
                <button
                    onClick={() => {
                        if (confirm('Remove all saved articles? This cannot be undone.')) clearAll();
                    }}
                    className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                    Clear all
                </button>
            </div>

            {matched.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">By issue</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                        {matched.map(({ magazine, articleIndex }) => (
                            <BookmarkedIssueCard
                                key={`${magazine.issue}-${articleIndex}`}
                                magazine={magazine}
                                articleIndex={articleIndex}
                            />
                        ))}
                    </div>
                </section>
            )}

            {unmatched.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-xl font-semibold text-cyan-400 mb-4">Unavailable</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        These saved articles aren&apos;t in the current archive data. They may
                        belong to a removed issue or a renamed article.
                    </p>
                    <ul className="space-y-2">
                        {unmatched.map((b) => (
                            <li
                                key={`${b.issue}-${b.articleIndex}-${b.savedAt}`}
                                className="px-4 py-2 bg-gray-800 rounded text-gray-200"
                            >
                                <span className="font-semibold">{b.name}</span>
                                <span className="text-sm text-gray-400 ml-2">Issue {b.issue}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

function BookmarkedIssueCard({
    magazine,
    articleIndex,
}: {
    magazine: Magazine;
    articleIndex: number;
}) {
    // Reuse the existing Cover + title layout from MagazineCover, but the
    // "open modal" behaviour is replaced with a direct link to the article.
    const article = magazine.articles[articleIndex];
    if (!article) return null;
    const subtitle = displayTitle(article.name, article.articleTitle);

    return (
        <div className="magazine-cover group">
            <Link
                to={`/article/${articleIndex}/read?issue=${magazine.issue}`}
                className="block"
                aria-label={`Open saved article: ${article.name} (Issue ${magazine.issue})`}
            >
                <Cover
                    issue={magazine.issue}
                    alt={`Cover of Cinefex Issue ${magazine.issue}`}
                    className="w-full rounded-lg shadow-lg object-cover aspect-square"
                    loading="lazy"
                />
                <div className="mt-3 text-center">
                    <h3 className="font-semibold text-white">Issue {magazine.issue}</h3>
                    <p className="text-sm text-cyan-300 group-hover:text-cyan-200 transition-colors truncate">
                        {article.name}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>
                    )}
                </div>
            </Link>
        </div>
    );
}
