import { describe, it, expect } from 'vitest';
import { getArticleNeighbors, getIssueNeighbors } from '../nav';

describe('getIssueNeighbors', () => {
    it('returns [null, null] on empty list', () => {
        expect(getIssueNeighbors([], 5)).toEqual({ prev: null, next: null });
    });

    it('returns [null, second] for the first issue', () => {
        const mags = [{ issue: 1 }, { issue: 2 }, { issue: 3 }];
        expect(getIssueNeighbors(mags, 1)).toEqual({ prev: null, next: 2 });
    });

    it('returns [previous, null] for the last issue', () => {
        const mags = [{ issue: 1 }, { issue: 2 }, { issue: 3 }];
        expect(getIssueNeighbors(mags, 3)).toEqual({ prev: 2, next: null });
    });

    it('returns both neighbors for a middle issue', () => {
        const mags = [{ issue: 1 }, { issue: 2 }, { issue: 3 }];
        expect(getIssueNeighbors(mags, 2)).toEqual({ prev: 1, next: 3 });
    });

    it('sorts by issue number even if input is unsorted', () => {
        const mags = [{ issue: 50 }, { issue: 1 }, { issue: 100 }];
        expect(getIssueNeighbors(mags, 50)).toEqual({ prev: 1, next: 100 });
    });

    it('returns [null, null] when current issue is not in the list', () => {
        const mags = [{ issue: 1 }, { issue: 2 }];
        expect(getIssueNeighbors(mags, 99)).toEqual({ prev: null, next: null });
    });

    it('handles single-issue list', () => {
        const mags = [{ issue: 1 }];
        expect(getIssueNeighbors(mags, 1)).toEqual({ prev: null, next: null });
    });
});

describe('getArticleNeighbors', () => {
    it('flattens across issues and returns prev/next tuples', () => {
        const mags = [
            { issue: 1, articles: [{ name: 'A' }, { name: 'B' }] },
            { issue: 2, articles: [{ name: 'C' }] },
        ];
        expect(getArticleNeighbors(mags, 1, 0)).toEqual({
            prev: null,
            next: { issue: 1, articleIndex: 1, articleName: 'B' },
        });
        expect(getArticleNeighbors(mags, 1, 1)).toEqual({
            prev: { issue: 1, articleIndex: 0, articleName: 'A' },
            next: { issue: 2, articleIndex: 0, articleName: 'C' },
        });
        expect(getArticleNeighbors(mags, 2, 0)).toEqual({
            prev: { issue: 1, articleIndex: 1, articleName: 'B' },
            next: null,
        });
    });

    it('returns [null, null] on empty list', () => {
        expect(getArticleNeighbors([], 1, 0)).toEqual({ prev: null, next: null });
    });

    it('returns [null, null] when issue/article combo is unknown', () => {
        const mags = [{ issue: 1, articles: [{ name: 'A' }] }];
        expect(getArticleNeighbors(mags, 99, 0)).toEqual({ prev: null, next: null });
        expect(getArticleNeighbors(mags, 1, 5)).toEqual({ prev: null, next: null });
    });
});
