import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ArchiveContext, ArchiveContextValue } from '../../../context/ArchiveContext';
import { Magazine } from '../../../types';
import { ArticleViewer } from '../ArticleViewer';

// Mock the style-injection pipeline so we can assert it is invoked with the
// correct (issueNumber, isReadingView) arguments for each format threshold.
// The mock must be declared with `vi.mock` at module scope so the hoisted
// factory replaces the real module before ArticleViewer imports it.
vi.mock('../../../services/styleInjection', () => ({
    injectStyles: vi.fn(),
    appendImageGalleryToArchival: vi.fn(),
}));

import { injectStyles, appendImageGalleryToArchival } from '../../../services/styleInjection';

const SAMPLE: Magazine[] = [
    {
        // Legacy issue (<= 126): old-format reading/archival paths
        issue: 5,
        title: 'Issue 5',
        year: 1981,
        articles: [
            { name: 'Article 5-A', readingUrl: 'issues/5/1.ReadingView.html', archiveUrl: 'issues/5/1.ArchivalView.html' },
            { name: 'Article 5-B', readingUrl: 'issues/5/2.ReadingView.html', archiveUrl: 'issues/5/2.ArchivalView.html' },
        ],
    },
    {
        // New-format issue (> 126): manuscript + optional imageGallery
        issue: 130,
        title: 'Issue 130',
        year: 2012,
        articles: [
            {
                name: 'Article 130-A',
                readingUrl: 'issues/130/readingView1.html',
                archiveUrl: 'issues/130/manuscript1.html',
                imageGalleryUrl: 'issues/130/imageGallery1.html',
            },
        ],
    },
];

function makeContextValue(magazines: Magazine[]): ArchiveContextValue {
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
    };
}

/**
 * Render ArticleViewer at a given route. The route shape is
 *   /article/:articleIndex/:viewMode?issue=<issueNumber>
 * matching App.tsx's route declaration.
 */
function renderViewer(route: string, magazines: Magazine[] = SAMPLE) {
    return render(
        <ArchiveContext.Provider value={makeContextValue(magazines)}>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path="/article/:articleIndex/:viewMode" element={<ArticleViewer />} />
                    <Route path="/" element={<div data-testid="archive-home">Home</div>} />
                </Routes>
            </MemoryRouter>
        </ArchiveContext.Provider>,
    );
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ArticleViewer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the article-not-found state for an unknown issue', () => {
        renderViewer('/article/0/read?issue=999');
        expect(screen.getByText('Article not found')).toBeTruthy();
    });

    it('renders the article-not-found state for a malformed URL', () => {
        renderViewer('/article/abc/read?issue=notanumber');
        expect(screen.getByText('The article URL is malformed.')).toBeTruthy();
    });

    it('renders the viewer dialog and iframe for a valid legacy reading-view article', async () => {
        renderViewer('/article/0/read?issue=5');
        const dialog = await screen.findByRole('dialog', { name: /Article viewer/ });
        expect(dialog).toBeTruthy();
        const iframe = dialog.querySelector('iframe');
        expect(iframe).toBeTruthy();
        expect(iframe?.getAttribute('src')).toBe('issues/5/1.ReadingView.html');
    });

    it('calls injectStyles with (iframe, issueNumber, isReadingView=true) on iframe load for a legacy issue', async () => {
        renderViewer('/article/0/read?issue=5');
        // Wait for the iframe to appear, then simulate its load event so the
        // onLoad handler fires (jsdom does not auto-fire onLoad for src).
        const iframe = await screen.findByTitle('Article: Article 5-A');
        iframe.dispatchEvent(new Event('load'));

        await waitFor(() => {
            expect(injectStyles).toHaveBeenCalledTimes(1);
        });
        const [, issueNumber, isReadingView] = vi.mocked(injectStyles).mock.calls[0];
        expect(issueNumber).toBe(5);
        expect(isReadingView).toBe(true);
        // Legacy reading view must NOT trigger gallery appending (that's new-format only)
        expect(appendImageGalleryToArchival).not.toHaveBeenCalled();
    });

    it('calls injectStyles with isReadingView=false and does NOT append gallery for a legacy archival view', async () => {
        renderViewer('/article/0/archive?issue=5');
        const iframe = await screen.findByTitle('Article: Article 5-A');
        iframe.dispatchEvent(new Event('load'));

        await waitFor(() => {
            expect(injectStyles).toHaveBeenCalledTimes(1);
        });
        const [, issueNumber, isReadingView] = vi.mocked(injectStyles).mock.calls[0];
        expect(issueNumber).toBe(5);
        expect(isReadingView).toBe(false);
        // Legacy archival (issue <= 126) must not append the image gallery
        expect(appendImageGalleryToArchival).not.toHaveBeenCalled();
    });

    it('appends the image gallery on a new-format archival view (issue > 126) when imageGalleryUrl is present', async () => {
        renderViewer('/article/0/archive?issue=130');
        const iframe = await screen.findByTitle('Article: Article 130-A');
        iframe.dispatchEvent(new Event('load'));

        await waitFor(() => {
            expect(injectStyles).toHaveBeenCalledTimes(1);
        });
        const [, issueNumber, isReadingView] = vi.mocked(injectStyles).mock.calls[0];
        expect(issueNumber).toBe(130);
        expect(isReadingView).toBe(false);

        await waitFor(() => {
            expect(appendImageGalleryToArchival).toHaveBeenCalledTimes(1);
        });
        const [, galleryUrl] = vi.mocked(appendImageGalleryToArchival).mock.calls[0];
        expect(galleryUrl).toBe('issues/130/imageGallery1.html');
    });

    it('does NOT append the image gallery on a new-format reading view (only archival gets the gallery)', async () => {
        renderViewer('/article/0/read?issue=130');
        const iframe = await screen.findByTitle('Article: Article 130-A');
        iframe.dispatchEvent(new Event('load'));

        await waitFor(() => {
            expect(injectStyles).toHaveBeenCalledTimes(1);
        });
        expect(appendImageGalleryToArchival).not.toHaveBeenCalled();
    });
});
