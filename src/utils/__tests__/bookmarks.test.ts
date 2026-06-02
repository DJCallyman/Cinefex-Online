import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    addBookmark,
    isBookmarked,
    makeBookmarkKey,
    readBookmarks,
    removeBookmark,
    writeBookmarks,
    Bookmark,
} from '../bookmarks';

describe('bookmarks helpers', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('reads empty list when nothing is stored', () => {
        expect(readBookmarks()).toEqual([]);
    });

    it('round-trips a list through localStorage', () => {
        const list: Bookmark[] = [
            { issue: 1, articleIndex: 0, name: 'Alien', savedAt: 100 },
            { issue: 2, articleIndex: 1, name: 'Outland', savedAt: 200 },
        ];
        writeBookmarks(list);
        expect(readBookmarks()).toEqual(list);
    });

    it('drops malformed entries from localStorage', () => {
        localStorage.setItem(
            'cinefex.bookmarks.v1',
            JSON.stringify([
                { issue: 1, articleIndex: 0, name: 'Good', savedAt: 1 },
                { issue: 'oops' }, // invalid
                null,
                'string',
                { issue: 2, articleIndex: 0, name: 'MissingSavedAt' },
            ]),
        );
        const result = readBookmarks();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Good');
    });

    it('survives a corrupted JSON payload', () => {
        localStorage.setItem('cinefex.bookmarks.v1', 'not json{{');
        expect(readBookmarks()).toEqual([]);
    });

    it('makeBookmarkKey formats the canonical key', () => {
        expect(makeBookmarkKey(1, 0)).toBe('1/0');
        expect(makeBookmarkKey(127, 3)).toBe('127/3');
    });

    it('isBookmarked finds by (issue, articleIndex)', () => {
        const list: Bookmark[] = [
            { issue: 1, articleIndex: 0, name: 'A', savedAt: 1 },
            { issue: 1, articleIndex: 1, name: 'B', savedAt: 2 },
        ];
        expect(isBookmarked(list, 1, 0)).toBe(true);
        expect(isBookmarked(list, 1, 1)).toBe(true);
        expect(isBookmarked(list, 1, 2)).toBe(false);
        expect(isBookmarked(list, 2, 0)).toBe(false);
    });

    it('addBookmark appends and deduplicates', () => {
        const initial: Bookmark[] = [{ issue: 1, articleIndex: 0, name: 'A', savedAt: 1 }];
        const next = addBookmark(initial, { issue: 1, articleIndex: 1, name: 'B' });
        expect(next).toHaveLength(2);
        // Duplicate add is a no-op
        const same = addBookmark(next, { issue: 1, articleIndex: 0, name: 'A' });
        expect(same).toHaveLength(2);
    });

    it('addBookmark sorts newest first', () => {
        const older: Bookmark = { issue: 1, articleIndex: 0, name: 'Older', savedAt: 1000 };
        const next = addBookmark([older], { issue: 2, articleIndex: 0, name: 'Newer' });
        expect(next[0].name).toBe('Newer');
        expect(next[1].name).toBe('Older');
    });

    it('removeBookmark removes the right entry', () => {
        const list: Bookmark[] = [
            { issue: 1, articleIndex: 0, name: 'A', savedAt: 1 },
            { issue: 1, articleIndex: 1, name: 'B', savedAt: 2 },
            { issue: 2, articleIndex: 0, name: 'C', savedAt: 3 },
        ];
        const after = removeBookmark(list, 1, 1);
        expect(after).toHaveLength(2);
        expect(after.map((b) => b.name)).toEqual(['A', 'C']);
    });

    it('removeBookmark on a missing entry is a no-op', () => {
        const list: Bookmark[] = [{ issue: 1, articleIndex: 0, name: 'A', savedAt: 1 }];
        expect(removeBookmark(list, 99, 0)).toEqual(list);
    });
});
