import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArticleGallery } from '../ArticleGallery';
import { Article } from '../../../types';

/**
 * Unit tests for the image gallery extraction.
 *
 * The two regressions these guard against:
 *  1. New-format issues (127+) split the article across readingView*.html
 *     (text only, 0 imgs) and imageGallery*.html (all the actual photos).
 *     Fetching the reading view alone produced "No images found in this
 *     article." on every 127+ issue. The fix: prefer imageGalleryUrl when
 *     present, fall back to readingUrl.
 *  2. The new-format imageGallery*.html pages also contain the publisher's
 *     iPad chrome (th0 thumbs, button- nav arrows, video_icon). If we
 *     naively render every <img> we'd flood the gallery with hundreds of
 *     1×1 navigation images. Filter them out at extraction time.
 */

const READING_HTML = `
    <html><body>
        <img src="images/photo1.jpg" alt="A photo" />
        <img src="images/photo2.jpg" />
    </body></html>
`;

const GALLERY_HTML = `
    <html><body>
        <img src="images/th0_001.png" />
        <img src="images/th0_002.png" />
        <img src="images/button-prev.png" />
        <img src="images/button-next.png" />
        <img src="images/video_icon.png" />
        <img src="images/real_photo1.jpg" alt="Figure 1" />
        <img src="images/real_photo2.jpg" alt="Figure 2" />
        <img src="images/real_photo3.jpg" alt="Figure 3" />
    </body></html>
`;

const REAL_PHOTO_COUNT = 3;

function makeArticle(overrides: Partial<Article> = {}): Article {
    return {
        name: 'Test Article',
        readingUrl: 'issues/130/readingView1.html',
        archiveUrl: 'issues/130/manuscript1.html',
        ...overrides,
    };
}

function mockFetch(responses: Record<string, string>) {
    return vi.fn((url: string | URL | Request) => {
        const u = typeof url === 'string' ? url : url.toString();
        for (const [match, body] of Object.entries(responses)) {
            if (u.endsWith(match)) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: () => Promise.resolve(body),
                } as Response);
            }
        }
        return Promise.resolve({
            ok: false,
            status: 404,
            text: () => Promise.resolve(''),
        } as Response);
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('ArticleGallery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders an empty state, then a grid, when the reading view contains images (old format)', async () => {
        globalThis.fetch = mockFetch({ 'readingView1.html': READING_HTML }) as typeof fetch;

        render(<ArticleGallery article={makeArticle()} issueNumber={4} />);

        // Loading state is shown first, then the image grid mounts.
        const buttons = await screen.findAllByRole('button');
        // 2 images => 2 grid buttons (lightbox is not mounted yet)
        await waitFor(() => {
            expect(buttons.length).toBe(2);
        });

        // No "No images found" message
        expect(screen.queryByText(/No images found/i)).toBeNull();
    });

    it('uses imageGalleryUrl instead of readingUrl when both are present (new format)', async () => {
        // If the gallery mistakenly fetched the reading view for issue 130
        // (which has no inline images), we'd see "No images found" after the
        // fetch resolves. The fix: use imageGalleryUrl when present.
        globalThis.fetch = mockFetch({
            'readingView1.html': '<html><body>no images here</body></html>',
            'imageGallery1.html': GALLERY_HTML,
        }) as typeof fetch;

        const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

        render(
            <ArticleGallery
                article={makeArticle({ imageGalleryUrl: 'issues/130/imageGallery1.html' })}
                issueNumber={130}
            />,
        );

        // Wait for the fetch to complete and the grid to render.
        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalled();
        });

        // The component must have asked for imageGallery1.html, not the reading view.
        const calledUrls = fetchSpy.mock.calls.map((c) => c[0] as string);
        expect(calledUrls.some((u) => u.endsWith('imageGallery1.html'))).toBe(true);
        expect(calledUrls.some((u) => u.endsWith('readingView1.html'))).toBe(false);

        // Wait for the gallery grid to mount and the chrome to be filtered.
        const grid = await waitFor(() => {
            const buttons = screen.queryAllByRole('button');
            expect(buttons.length).toBe(REAL_PHOTO_COUNT);
            return buttons;
        });
        expect(grid.length).toBe(REAL_PHOTO_COUNT);

        // None of the chrome images should be in the alt text or src.
        const allHtml = document.body.innerHTML;
        expect(allHtml).not.toContain('th0');
        expect(allHtml).not.toContain('button-');
        expect(allHtml).not.toContain('video_icon');

        expect(screen.queryByText(/No images found/i)).toBeNull();
    });

    it('falls back to readingUrl when imageGalleryUrl is absent (legacy 1-126 issues)', async () => {
        // A legacy issue has no imageGalleryUrl, but its ReadingView
        // inlines all images. The component must still produce a grid.
        const legacyArticle: Article = {
            name: 'Legacy Article',
            readingUrl: 'issues/4/1.ReadingView.html',
            archiveUrl: 'issues/4/1.ArchivalView.html',
        };

        globalThis.fetch = mockFetch({ '1.ReadingView.html': READING_HTML }) as typeof fetch;

        render(<ArticleGallery article={legacyArticle} issueNumber={4} />);

        const buttons = await screen.findAllByRole('button');
        await waitFor(() => {
            expect(buttons.length).toBe(2);
        });
        expect(screen.queryByText(/No images found/i)).toBeNull();
    });

    it('shows "No images found" only when neither source contains any figures', async () => {
        // imageGalleryUrl is present but the gallery file has only chrome
        // (every <img> is a th0/button-/video_icon). After filtering, no
        // real images remain, and the empty-state message is correct.
        const galleryAllChrome = `
            <html><body>
                <img src="images/th0_001.png" />
                <img src="images/button-prev.png" />
                <img src="images/video_icon.png" />
            </body></html>
        `;

        globalThis.fetch = mockFetch({
            'imageGallery1.html': galleryAllChrome,
        }) as typeof fetch;

        render(
            <ArticleGallery
                article={makeArticle({ imageGalleryUrl: 'issues/130/imageGallery1.html' })}
                issueNumber={130}
            />,
        );

        await screen.findByText(/No images found/i);
    });

    it('rewrites legacy images_400/ thumbnails to images/ for the lightbox (issue <= 126)', async () => {
        // Legacy ReadingView HTML references 400px-wide thumbnails under
        // images_400/. The full-resolution versions live in a sibling
        // images/ directory with identical filenames. The grid should keep
        // using the small src for fast loading, but clicking a tile must
        // open the full-size image in the lightbox — otherwise the
        // lightbox shows a 400px image that matches the thumbnail size.
        const legacyReadingHtml = `
            <html><body>
                <img src="images_400/Cinefex-4-p4-img01.jpg" alt="Figure A" />
                <img src="images_400/Cinefex-4-p6-img01.jpg" alt="Figure B" />
            </body></html>
        `;

        globalThis.fetch = mockFetch({ '1.ReadingView.html': legacyReadingHtml }) as typeof fetch;

        const legacyArticle: Article = {
            name: 'Legacy Article',
            readingUrl: 'issues/4/1.ReadingView.html',
            archiveUrl: 'issues/4/1.ArchivalView.html',
        };

        render(<ArticleGallery article={legacyArticle} issueNumber={4} />);

        // Wait for the grid to render, then click the first tile.
        const tiles = await screen.findAllByRole('button');
        await waitFor(() => {
            expect(tiles.length).toBe(2);
        });

        // The grid <img> should still point at the small images_400/ version.
        const gridImg = tiles[0].querySelector('img');
        expect(gridImg?.getAttribute('src')).toMatch(/\/images_400\//);

        // Open the lightbox by clicking the first tile.
        tiles[0].click();

        // The lightbox <img> must point at the full-size images/ version,
        // not the images_400/ thumbnail.
        const lightbox = await screen.findByRole('dialog', { name: /Image lightbox/i });
        const lightboxImg = lightbox.querySelector('img');
        expect(lightboxImg?.getAttribute('src')).toMatch(/\/images\//);
        expect(lightboxImg?.getAttribute('src')).not.toMatch(/\/images_400\//);
        expect(lightboxImg?.getAttribute('src')).toMatch(/Cinefex-4-p4-img01\.jpg$/);
    });

    it('leaves new-format imageGallery srcs untouched (no images_400 rewrite needed)', async () => {
        // New-format imageGallery*.html already references full-size images
        // under images/, so the lightbox src should equal the grid src.
        const newFormatGallery = `
            <html><body>
                <img src="images/Cinefex-130-p16.1-SNOW.jpg" alt="Figure A" />
            </body></html>
        `;

        globalThis.fetch = mockFetch({ 'imageGallery1.html': newFormatGallery }) as typeof fetch;

        render(
            <ArticleGallery
                article={makeArticle({ imageGalleryUrl: 'issues/130/imageGallery1.html' })}
                issueNumber={130}
            />,
        );

        const tiles = await screen.findAllByRole('button');
        await waitFor(() => {
            expect(tiles.length).toBe(1);
        });

        const gridSrc = tiles[0].querySelector('img')?.getAttribute('src');
        tiles[0].click();

        const lightbox = await screen.findByRole('dialog', { name: /Image lightbox/i });
        const lightboxSrc = lightbox.querySelector('img')?.getAttribute('src');

        expect(gridSrc).toMatch(/\/images\//);
        expect(lightboxSrc).toBe(gridSrc);
    });
});
