import { useBookmarks } from '../../context/BookmarksContext';

interface BookmarkButtonProps {
    issue: number;
    articleIndex: number;
    name: string;
    className?: string;
    /** Visual size hint. */
    size?: 'sm' | 'md';
}

const SIZE_CLASSES: Record<NonNullable<BookmarkButtonProps['size']>, string> = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
};

const ICON_SIZES: Record<NonNullable<BookmarkButtonProps['size']>, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
};

/**
 * Star toggle for bookmarking. The button is just a toggle; it does not
 * know whether it represents an issue (cover star) or an article (modal
 * star) — the parent passes the right (issue, articleIndex) pair.
 *
 * When toggled from a cover, the parent passes the issue's first article
 * index as a sentinel so the user can later jump straight into that issue
 * from the bookmarks view.
 */
export function BookmarkButton({ issue, articleIndex, name, className, size = 'md' }: BookmarkButtonProps) {
    const { isBookmarked, toggleBookmark } = useBookmarks();
    const saved = isBookmarked(issue, articleIndex);

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleBookmark({ issue, articleIndex, name });
            }}
            aria-label={saved ? `Remove ${name} from saved articles` : `Save ${name} to bookmarks`}
            aria-pressed={saved}
            title={saved ? 'Remove from saved' : 'Save for later'}
            data-bookmark-state={saved ? 'saved' : 'unsaved'}
            className={
                'inline-flex items-center justify-center rounded-full transition-colors ' +
                (saved
                    ? 'bg-cyan-500 text-gray-900 hover:bg-cyan-400 '
                    : 'bg-black/60 text-gray-200 hover:bg-cyan-500 hover:text-gray-900 ') +
                SIZE_CLASSES[size] +
                (className ? ' ' + className : '')
            }
        >
            <svg className={ICON_SIZES[size]} fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
            </svg>
        </button>
    );
}
