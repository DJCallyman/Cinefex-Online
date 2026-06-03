import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../SearchBar';
import { ArchiveProvider } from '../../../context/ArchiveContext';
import { CONFIG } from '../../../config';
import { Magazine } from '../../../types';

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
        articles: [
            { name: 'The Empire Strikes Back', readingUrl: 'e', archiveUrl: 'f', articleTitle: 'Tauntauns Walkers & Probots' },
        ],
    },
    {
        issue: 50,
        title: 'Jurassic Park',
        year: 1993,
        articles: [{ name: 'Jurassic Park', readingUrl: 'g', archiveUrl: 'h' }],
    },
];

function mockFetchSuccess(data: Magazine[]) {
    return vi.fn().mockImplementation((url: string) => {
        if (url === CONFIG.DATA_URL) {
            return Promise.resolve({ ok: true, status: 200, json: async () => data });
        }
        // /search_index.json: 404 keeps fulltext mode inert in title-mode tests
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });
}

const DEBOUNCE_BUFFER = CONFIG.DEBOUNCE_MS + 50;

describe('SearchBar status pill (title mode)', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('shows no pill when the input is empty', async () => {
        globalThis.fetch = mockFetchSuccess(SAMPLE) as typeof fetch;
        render(
            <ArchiveProvider>
                <SearchBar />
            </ArchiveProvider>,
        );

        // Wait for the archive data fetch to resolve and the input to render.
        await waitFor(() => {
            screen.getByLabelText('Search the archive');
        });

        expect(screen.queryByTestId('search-status')).toBeNull();
    });

    it('shows "No matching issues" for a query with zero hits', async () => {
        globalThis.fetch = mockFetchSuccess(SAMPLE) as typeof fetch;
        render(
            <ArchiveProvider>
                <SearchBar />
            </ArchiveProvider>,
        );

        const input = (await waitFor(() =>
            screen.getByLabelText('Search the archive') as HTMLInputElement,
        ))!;

        await act(async () => {
            fireEvent.change(input, { target: { value: 'xyzqqq' } });
            await vi.advanceTimersByTimeAsync(DEBOUNCE_BUFFER);
        });

        expect(screen.getByTestId('search-status').textContent).toBe('No matching issues');
    });

    it('shows singular "1 matching issue" for a single hit', async () => {
        globalThis.fetch = mockFetchSuccess(SAMPLE) as typeof fetch;
        render(
            <ArchiveProvider>
                <SearchBar />
            </ArchiveProvider>,
        );

        const input = (await waitFor(() =>
            screen.getByLabelText('Search the archive') as HTMLInputElement,
        ))!;

        await act(async () => {
            fireEvent.change(input, { target: { value: 'empire' } });
            await vi.advanceTimersByTimeAsync(DEBOUNCE_BUFFER);
        });

        expect(screen.getByTestId('search-status').textContent).toBe('1 matching issue');
    });

    it('shows plural "N matching issues" for multiple hits', async () => {
        globalThis.fetch = mockFetchSuccess(SAMPLE) as typeof fetch;
        render(
            <ArchiveProvider>
                <SearchBar />
            </ArchiveProvider>,
        );

        const input = (await waitFor(() =>
            screen.getByLabelText('Search the archive') as HTMLInputElement,
        ))!;

        // "198" is a substring of year 1980 → matches issues 1 and 3.
        await act(async () => {
            fireEvent.change(input, { target: { value: '198' } });
            await vi.advanceTimersByTimeAsync(DEBOUNCE_BUFFER);
        });

        expect(screen.getByTestId('search-status').textContent).toBe('2 matching issues');
    });

    it('hides the pill again when the input is cleared', async () => {
        globalThis.fetch = mockFetchSuccess(SAMPLE) as typeof fetch;
        render(
            <ArchiveProvider>
                <SearchBar />
            </ArchiveProvider>,
        );

        const input = (await waitFor(() =>
            screen.getByLabelText('Search the archive') as HTMLInputElement,
        ))!;

        await act(async () => {
            fireEvent.change(input, { target: { value: 'empire' } });
            await vi.advanceTimersByTimeAsync(DEBOUNCE_BUFFER);
        });
        expect(screen.getByTestId('search-status').textContent).toBe('1 matching issue');

        await act(async () => {
            fireEvent.change(input, { target: { value: '' } });
            await vi.advanceTimersByTimeAsync(DEBOUNCE_BUFFER);
        });

        expect(screen.queryByTestId('search-status')).toBeNull();
    });
});
