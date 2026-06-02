import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, waitFor, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { ArchiveProvider, useArchiveContext } from '../ArchiveContext';
import { Magazine } from '../../types';

const SAMPLE: Magazine[] = [
    {
        issue: 1,
        title: 'Star Trek / Alien',
        year: 1980,
        articles: [
            { name: 'Star Trek: The Motion Picture', readingUrl: 'a', archiveUrl: 'b' },
            { name: 'Alien', readingUrl: 'c', archiveUrl: 'd' },
        ],
    },
    {
        issue: 3,
        title: 'The Empire Strikes Back',
        year: 1980,
        articles: [{ name: 'The Empire Strikes Back', readingUrl: 'e', archiveUrl: 'f', articleTitle: 'Tauntauns Walkers & Probots' }],
    },
    {
        issue: 50,
        title: 'Jurassic Park',
        year: 1993,
        articles: [{ name: 'Jurassic Park', readingUrl: 'g', archiveUrl: 'h' }],
    },
    {
        issue: 130,
        title: 'Avengers',
        year: 2012,
        articles: [{ name: 'The Avengers', readingUrl: 'i', archiveUrl: 'j' }],
    },
];

function wrapper({ children }: { children: ReactNode }) {
    return <ArchiveProvider>{children}</ArchiveProvider>;
}

function mockFetchSuccess(data: Magazine[]) {
    globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => data,
    } as Response);
}

function mockFetchFailure(status = 500) {
    globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({}),
    } as Response);
}

describe('ArchiveContext', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('loads magazines, populates buckets, and clears loading flag', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.magazines).toEqual(SAMPLE);
        expect(result.current.error).toBeNull();

        // Buckets: years 1980, 1993, 2012 fall into '1976-1980', '1991-1995', '2011-2015'
        // (the bucket label is "the 5 years ending at this year" via floor((year-1)/5)*5+1)
        const keys = result.current.buckets.map((b) => b.key);
        expect(keys).toEqual(['1976-1980', '1991-1995', '2011-2015']);
        expect(result.current.buckets[0].magazines.map((m) => m.issue)).toEqual([1, 3]);
    });

    it('captures error and clears loading on fetch failure', async () => {
        mockFetchFailure(500);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error).toBeTruthy();
        expect(result.current.magazines).toEqual([]);
    });

    it('searchQuery filter returns null when empty (signals "show all")', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.filteredMagazines).toBeNull();
    });

    it('filters by article name (case-insensitive)', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.setSearchQuery('empire'));
        const filtered = result.current.filteredMagazines!;
        expect(filtered).toHaveLength(1);
        expect(filtered[0].issue).toBe(3);
    });

    it('filters by exact issue number string match', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.setSearchQuery('50'));
        expect(result.current.filteredMagazines!.map((m) => m.issue)).toEqual([50]);
    });

    it('filters by year substring', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.setSearchQuery('1993'));
        expect(result.current.filteredMagazines!.map((m) => m.issue)).toEqual([50]);
    });

    it('filters by articleTitle when it differs from name', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.setSearchQuery('tauntauns'));
        expect(result.current.filteredMagazines!.map((m) => m.issue)).toEqual([3]);
    });

    it('returns empty array for no matches', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.setSearchQuery('xyzqqq'));
        expect(result.current.filteredMagazines).toEqual([]);
    });

    it('getMagazineByIssue finds the right magazine', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.getMagazineByIssue(130)?.title).toBe('Avengers');
        expect(result.current.getMagazineByIssue(9999)).toBeUndefined();
    });

    it('selectedIssue state round-trips via setter', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.selectedIssue).toBeNull();
        act(() => result.current.setSelectedIssue(50));
        expect(result.current.selectedIssue).toBe(50);
        act(() => result.current.setSelectedIssue(null));
        expect(result.current.selectedIssue).toBeNull();
    });

    it('defaults to title search mode', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.searchMode).toBe('title');
    });

    it('search mode round-trips via setter', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.searchMode).toBe('title');
        act(() => result.current.setSearchMode('fulltext'));
        expect(result.current.searchMode).toBe('fulltext');
        act(() => result.current.setSearchMode('title'));
        expect(result.current.searchMode).toBe('title');
    });

    it('fulltext mode shows the full archive when no query is typed', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.setSearchMode('fulltext'));
        expect(result.current.filteredMagazines).toBeNull();
    });

    it('fulltext mode returns [] when the index is unavailable', async () => {
        // /search_index.json is mocked to return a non-Payload (just the SAMPLE
        // magazines again, since the fetch mock returns the same thing for
        // every URL). The hook falls back to "no index", so search() returns
        // empty and filteredMagazines should be [].
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => {
            result.current.setSearchMode('fulltext');
            result.current.setSearchQuery('empire');
        });

        expect(result.current.fullTextHits).toEqual([]);
        expect(result.current.filteredMagazines).toEqual([]);
    });

    it('title mode and fulltext mode are strictly separate', async () => {
        mockFetchSuccess(SAMPLE);
        const { result } = renderHook(() => useArchiveContext(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // In title mode, "empire" matches issue 3 (Empire Strikes Back)
        act(() => result.current.setSearchQuery('empire'));
        expect(result.current.searchMode).toBe('title');
        expect(result.current.filteredMagazines!.map((m) => m.issue)).toEqual([3]);

        // Switching to fulltext mode should clear the title-mode results.
        // (The index is unavailable in tests, so fulltext-mode results are
        // an empty list, not the same title-mode list.)
        act(() => result.current.setSearchMode('fulltext'));
        expect(result.current.filteredMagazines).toEqual([]);
    });
});
