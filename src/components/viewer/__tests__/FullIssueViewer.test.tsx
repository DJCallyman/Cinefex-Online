import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ArchiveContext, ArchiveContextValue } from '../../../context/ArchiveContext';
import { Magazine } from '../../../types';
import { FullIssueViewer } from '../FullIssueViewer';

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
        issue: 2,
        title: 'Issue 2',
        year: 1981,
        articles: [{ name: 'Article 2', readingUrl: 'e', archiveUrl: 'f' }],
    },
    {
        issue: 3,
        title: 'Empire',
        year: 1980,
        articles: [{ name: 'Empire', readingUrl: 'g', archiveUrl: 'h' }],
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
        selectedIssue: null,
        setSelectedIssue: vi.fn(),
        ...overrides,
    };
}

function renderViewer(issueNumber: number, magazines: Magazine[] = SAMPLE) {
    const contextValue = makeContextValue(magazines);
    return render(
        <ArchiveContext.Provider value={contextValue}>
            <MemoryRouter initialEntries={[`/issue/${issueNumber}/full`]}>
                <Routes>
                    <Route path="/issue/:issueNumber/full" element={<FullIssueViewer />} />
                    <Route path="/" element={<div data-testid="archive-home">Home</div>} />
                </Routes>
            </MemoryRouter>
        </ArchiveContext.Provider>,
    );
}

afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = undefined as unknown as typeof fetch;
});

function stubIssueFetch() {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.endsWith('/cover.html')) {
            return Promise.resolve({
                ok: true,
                status: 200,
                text: async () =>
                    '<html><body><page page-num="1"><div class="page"></div></page></body></html>',
            } as Response);
        }
        return Promise.resolve({ ok: false, status: 404, text: async () => '' } as Response);
    });
}

describe('FullIssueViewer', () => {
    beforeEach(() => {
        stubIssueFetch();
    });

    it('renders the toolbar label and the viewer dialog', async () => {
        renderViewer(2);
        const dialog = await screen.findByRole('dialog', { name: /Full issue viewer: Issue 2/ });
        expect(dialog).toBeTruthy();
        expect(await screen.findByText(/Issue 2 · Full Issue/)).toBeTruthy();
    });

    it('shows enabled prev/next issue buttons when neighbors exist', async () => {
        renderViewer(2);
        const prev = await screen.findByRole('button', { name: /Previous issue: Issue 1/ });
        const next = await screen.findByRole('button', { name: /Next issue: Issue 3/ });
        expect(prev.hasAttribute('disabled')).toBe(false);
        expect(next.hasAttribute('disabled')).toBe(false);
    });

    it('disables prev at the first issue', async () => {
        renderViewer(1);
        const prev = await screen.findByRole('button', { name: /No previous/ });
        expect(prev.hasAttribute('disabled')).toBe(true);
    });

    it('disables next at the last issue', async () => {
        renderViewer(3);
        const next = await screen.findByRole('button', { name: /No next/ });
        expect(next.hasAttribute('disabled')).toBe(true);
    });

    it('navigates to the next issue when next button is clicked', async () => {
        renderViewer(2);
        fireEvent.click(screen.getByRole('button', { name: /Next issue: Issue 3/ }));
        await waitFor(() => {
            expect(screen.getByText(/Issue 3 · Full Issue/)).toBeTruthy();
        });
    });

    it('navigates to the previous issue when prev button is clicked', async () => {
        renderViewer(2);
        fireEvent.click(screen.getByRole('button', { name: /Previous issue: Issue 1/ }));
        await waitFor(() => {
            expect(screen.getByText(/Issue 1 · Full Issue/)).toBeTruthy();
        });
    });

    it('close button navigates to /', async () => {
        renderViewer(2);
        fireEvent.click(screen.getByRole('button', { name: 'Close viewer' }));
        await waitFor(() => {
            expect(screen.getByTestId('archive-home')).toBeTruthy();
        });
    });

    it('renders an iframe once the stitched HTML resolves', async () => {
        renderViewer(2);
        const iframe = await waitFor(() => screen.getByTitle(/Cinefex Issue 2/) as HTMLIFrameElement);
        expect(iframe.tagName).toBe('IFRAME');
    });
});

describe('FullIssueViewer: issue not found', () => {
    beforeEach(() => {
        globalThis.fetch = vi.fn();
    });

    it('renders a fallback "Issue not found" view for a non-existent issue', () => {
        renderViewer(9999, SAMPLE);
        expect(screen.getByText('Issue not found')).toBeTruthy();
        expect(screen.getByText(/Issue 9999 is not in the archive/)).toBeTruthy();
    });
});
