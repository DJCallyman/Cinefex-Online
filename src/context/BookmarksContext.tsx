import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    ReactNode,
} from 'react';
import {
    Bookmark,
    addBookmark,
    isBookmarked,
    readBookmarks,
    removeBookmark,
    writeBookmarks,
} from '../utils/bookmarks';

interface BookmarksContextValue {
    bookmarks: Bookmark[];
    isBookmarked: (issue: number, articleIndex: number) => boolean;
    toggleBookmark: (entry: Omit<Bookmark, 'savedAt'>) => void;
    clearAll: () => void;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => readBookmarks());

    // Persist on every change
    useEffect(() => {
        writeBookmarks(bookmarks);
    }, [bookmarks]);

    // Sync across tabs
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onStorage = (e: StorageEvent) => {
            if (e.key === null || e.key.startsWith('cinefex.bookmarks')) {
                setBookmarks(readBookmarks());
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const check = useCallback(
        (issue: number, articleIndex: number) => isBookmarked(bookmarks, issue, articleIndex),
        [bookmarks],
    );

    const toggleBookmark = useCallback((entry: Omit<Bookmark, 'savedAt'>) => {
        setBookmarks((prev) =>
            isBookmarked(prev, entry.issue, entry.articleIndex)
                ? removeBookmark(prev, entry.issue, entry.articleIndex)
                : addBookmark(prev, entry),
        );
    }, []);

    const clearAll = useCallback(() => {
        setBookmarks([]);
    }, []);

    const value = useMemo(
        () => ({ bookmarks, isBookmarked: check, toggleBookmark, clearAll }),
        [bookmarks, check, toggleBookmark, clearAll],
    );

    return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks(): BookmarksContextValue {
    const ctx = useContext(BookmarksContext);
    if (!ctx) throw new Error('useBookmarks must be used within a BookmarksProvider');
    return ctx;
}
