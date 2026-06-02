/**
 * localStorage-backed bookmark store. Each bookmark identifies one article
 * by (issue, articleIndex). We keep the article's name at save time so the
 * bookmarks list can render even when the source data hasn't loaded yet.
 */

const STORAGE_KEY = 'cinefex.bookmarks.v1';

export interface Bookmark {
    issue: number;
    articleIndex: number;
    name: string;
    savedAt: number;
}

export function readBookmarks(): Bookmark[] {
    if (typeof localStorage === 'undefined') return [];
    let parsed: unknown;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
        (b): b is Bookmark =>
            typeof b === 'object' &&
            b !== null &&
            Number.isFinite((b as Bookmark).issue) &&
            Number.isFinite((b as Bookmark).articleIndex) &&
            typeof (b as Bookmark).name === 'string' &&
            Number.isFinite((b as Bookmark).savedAt),
    );
}

export function writeBookmarks(bookmarks: Bookmark[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
        // ignore quota / private-mode failures
    }
}

export function makeBookmarkKey(issue: number, articleIndex: number): string {
    return `${issue}/${articleIndex}`;
}

export function isBookmarked(bookmarks: Bookmark[], issue: number, articleIndex: number): boolean {
    const key = makeBookmarkKey(issue, articleIndex);
    return bookmarks.some((b) => makeBookmarkKey(b.issue, b.articleIndex) === key);
}

export function addBookmark(
    bookmarks: Bookmark[],
    entry: Omit<Bookmark, 'savedAt'>,
): Bookmark[] {
    if (isBookmarked(bookmarks, entry.issue, entry.articleIndex)) return bookmarks;
    const next = [...bookmarks, { ...entry, savedAt: Date.now() }];
    // Newest-first for display order
    next.sort((a, b) => b.savedAt - a.savedAt);
    return next;
}

export function removeBookmark(
    bookmarks: Bookmark[],
    issue: number,
    articleIndex: number,
): Bookmark[] {
    const key = makeBookmarkKey(issue, articleIndex);
    return bookmarks.filter((b) => makeBookmarkKey(b.issue, b.articleIndex) !== key);
}
