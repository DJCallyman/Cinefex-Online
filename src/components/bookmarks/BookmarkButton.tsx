import { useBookmarks } from '../../context/BookmarksContext';
import { useToast } from '../../context/ToastContext';
import { StarIcon } from '../icons/StarIcon';

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
    const { addToast } = useToast();
    const saved = isBookmarked(issue, articleIndex);

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleBookmark({ issue, articleIndex, name });
                addToast(saved ? 'Bookmark removed' : 'Bookmark added');
            }}
            // Stop Space/Enter from bubbling to the parent role="button"
            // (e.g. MagazineCover), which would also open the modal in
            // addition to toggling the bookmark.
            onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.stopPropagation();
                }
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
            <StarIcon filled={saved} className={ICON_SIZES[size]} />
        </button>
    );
}
