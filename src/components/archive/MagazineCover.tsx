import { useState, useRef } from 'react';
import { Magazine } from '../../types';
import { COVER_FALLBACK } from '../../config';
import { useArchiveContext } from '../../context/ArchiveContext';
import { highlight } from '../../utils/highlight';
import { displayTitle } from '../../utils/articleDisplay';
import { Cover } from './Cover';
import { BookmarkButton } from '../bookmarks/BookmarkButton';

interface MagazineCoverProps {
    magazine: Magazine;
    /** Eager-load + high fetch priority (used for first-bucket covers). */
    priority?: boolean;
}

export function MagazineCover({ magazine, priority = false }: MagazineCoverProps) {
    const { setSelectedIssue, searchQuery, searchMode, fullTextHits } = useArchiveContext();
    const [imgError, setImgError] = useState(false);
    const [showPopover, setShowPopover] = useState(false);
    const coverRef = useRef<HTMLDivElement>(null);
    const q = searchQuery.trim();

    // In fulltext mode, surface the best matching article name + a snippet
    // below the cover so the user knows which article matched. Title mode
    // never shows this — the cover/issue/year highlights are enough.
    const topHit =
        searchMode === 'fulltext' && q
            ? fullTextHits.find((h) => h.issue === magazine.issue)
            : undefined;
    const matchedArticle = topHit ? magazine.articles[topHit.articleIndex] : undefined;
    const matchedName = matchedArticle?.name ?? matchedArticle?.articleTitle ?? '';

    const handleClick = () => {
        setSelectedIssue(magazine.issue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    // Determine if popover should flip left (cover is in the right half of the viewport)
    const getPopoverStyle = (): React.CSSProperties => {
        if (!coverRef.current) return {};
        const rect = coverRef.current.getBoundingClientRect();
        const nearRightEdge = rect.right + 240 > window.innerWidth;
        if (nearRightEdge) {
            return { left: 'auto', right: 'calc(100% + 12px)' };
        }
        return {};
    };

    return (
        <div
            ref={coverRef}
            className={`magazine-cover cursor-pointer group relative ${showPopover ? 'z-20' : 'z-0'}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setShowPopover(true)}
            onMouseLeave={() => setShowPopover(false)}
            role="button"
            tabIndex={0}
            aria-label={`View Issue ${magazine.issue} (${magazine.year})`}
            data-issue={magazine.issue}
        >
            {/* Hover popover with article list. We render it as a sibling of
               the cover wrapper (via a non-interactive bridge element) and
               keep `pointer-events: none` so it never blocks clicks on the
               cover underneath. The 12px gap between cover and popover is
               filled by an invisible bridge so the cursor doesn't have to
               cross dead space — otherwise the cover's mouseLeave fires
               before the user reaches the popover. */}
            {showPopover && magazine.articles.length > 0 && (
                <>
                    {/* Invisible bridge so the cursor can travel from the
                       cover onto the popover without leaving the hover
                       region. Matches the 12px gap set in the popover CSS. */}
                    <div
                        className="cover-popover-bridge"
                        style={
                            getPopoverStyle().right !== undefined
                                ? { right: 'calc(100% + 12px)' }
                                : { left: 'calc(100% + 12px)' }
                        }
                        aria-hidden="true"
                    />
                    <div className="cover-popover" style={{ ...getPopoverStyle(), zIndex: 60 }}>
                        <p className="text-xs font-semibold text-cyan-400 mb-2">
                            Issue {magazine.issue} · {magazine.year}
                        </p>
                        <ul className="space-y-1.5">
                            {magazine.articles.map((article, idx) => {
                                const subtitle = displayTitle(article.name, article.articleTitle);
                                return (
                                    <li key={idx} className="text-xs text-gray-200 leading-snug">
                                        <span className="font-medium">{article.name}</span>
                                        {subtitle && (
                                            <span className="block text-gray-400 text-[11px]">{subtitle}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </>
            )}
            <div className="relative">
                <Cover
                    issue={magazine.issue}
                    alt={`Cover of Cinefex Issue ${magazine.issue}`}
                    className="w-full rounded-lg shadow-lg object-cover aspect-square"
                    fallback={imgError ? COVER_FALLBACK(magazine.issue) : undefined}
                    onError={() => setImgError(true)}
                    loading={priority ? 'eager' : 'lazy'}
                    fetchPriority={priority ? 'high' : 'auto'}
                />
                <div className="absolute top-2 right-2">
                    <BookmarkButton
                        issue={magazine.issue}
                        // articleIndex={0} is a sentinel meaning "bookmark the
                        // issue itself", not a specific article. The bookmark
                        // key is (issue, articleIndex); using 0 here lets the
                        // bookmark restore to the issue modal rather than a
                        // specific article viewer. Do NOT change without
                        // updating the bookmark-restore logic.
                        articleIndex={0}
                        name={magazine.title || `Issue ${magazine.issue}`}
                        size="sm"
                    />
                </div>
            </div>
            <div className="mt-3 text-center">
                <h3
                    className="font-semibold text-white"
                    dangerouslySetInnerHTML={{ __html: highlight(`Issue ${magazine.issue}`, q) }}
                />
                <p
                    className="text-sm text-gray-300 group-hover:text-white transition-colors"
                    dangerouslySetInnerHTML={{ __html: highlight(String(magazine.year), q) }}
                />
                {matchedName && (
                    <p
                        className="text-xs text-cyan-300 mt-1 truncate"
                        dangerouslySetInnerHTML={{ __html: highlight(matchedName, q) }}
                    />
                )}
                {topHit && topHit.snippet && (
                    <p
                        className="mt-2 text-xs text-gray-400 text-left line-clamp-3 px-1"
                        dangerouslySetInnerHTML={{ __html: highlight(topHit.snippet, q) }}
                    />
                )}
            </div>
        </div>
    );
}
