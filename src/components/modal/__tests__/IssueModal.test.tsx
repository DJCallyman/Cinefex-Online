import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ArchiveContext, ArchiveContextValue } from '../../../context/ArchiveContext';
import { Magazine } from '../../../types';
import { IssueModal } from '../IssueModal';

const SAMPLE: Magazine[] = [
    {
        issue: 50,
        title: 'Jurassic Park',
        year: 1993,
        articles: [
            { name: 'Jurassic Park', readingUrl: 'a', archiveUrl: 'b' },
            { name: 'Effects Scene: 64th Academy Awards', readingUrl: 'c', archiveUrl: 'd' },
        ],
    },
];

function makeContextValue(
    magazines: Magazine[],
    overrides: Partial<ArchiveContextValue> = {},
): ArchiveContextValue {
    return {
        magazines,
        buckets: [],
        isLoading: false,
        error: null,
        searchQuery: '',
        setSearchQuery: vi.fn(),
        searchMode: 'title',
        setSearchMode: vi.fn(),
        filteredMagazines: null,
        fullTextHits: [],
        isSearchIndexLoading: false,
        isSearchIndexReady: false,
        getMagazineByIssue: (issue: number) => magazines.find((m) => m.issue === issue),
        selectedIssue: 50,
        setSelectedIssue: vi.fn(),
        ...overrides,
    };
}

function renderModal() {
    const setSelectedIssue = vi.fn();
    const contextValue = makeContextValue(SAMPLE, { setSelectedIssue });
    const result = render(
        <ArchiveContext.Provider value={contextValue}>
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route
                        path="/"
                        element={<IssueModal issueNumber={50} />}
                    />
                    <Route
                        path="/issue/:issueNumber/full"
                        element={<div data-testid="full-issue-route">FullIssue</div>}
                    />
                </Routes>
            </MemoryRouter>
        </ArchiveContext.Provider>,
    );
    return { ...result, setSelectedIssue };
}

afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = undefined as unknown as typeof fetch;
});

describe('IssueModal: View Full Issue button', () => {
    beforeEach(() => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
        } as Response);
    });

    it('renders the View Full Issue button on the article list', async () => {
        renderModal();
        const btn = await screen.findByTestId('view-full-issue');
        expect(btn).toBeTruthy();
        expect(btn.textContent).toMatch(/View Full Issue/i);
    });

    it('does not change the article-selection flow (ViewOptions still has both buttons when an article is selected)', async () => {
        renderModal();
        const articleBtn = await screen.findByRole('button', { name: /Jurassic Park/ });
        fireEvent.click(articleBtn);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Read Online/ })).toBeTruthy();
            expect(screen.getByRole('button', { name: /View Original Layout/ })).toBeTruthy();
        });
        // The full-issue button should NOT be in the per-article view-options panel.
        expect(screen.queryByTestId('view-full-issue')).toBeNull();
    });

    it('clicking View Full Issue closes the modal and navigates to /issue/50/full', async () => {
        const { setSelectedIssue } = renderModal();
        fireEvent.click(await screen.findByTestId('view-full-issue'));
        expect(setSelectedIssue).toHaveBeenCalledWith(null);
        await waitFor(() => {
            expect(screen.getByTestId('full-issue-route')).toBeTruthy();
        });
    });
});
