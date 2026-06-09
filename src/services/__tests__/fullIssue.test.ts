import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildFullIssueHtml } from '../fullIssue';
import { Magazine } from '../../types';

const COVER_HTML = (n: number) => `<html><body>
<page page-num="1"><div class="page" style="background: url(images/cover-${n}.jpg); background-size: 864 768;"></div></page>
</body></html>`;

const MASTHEAD_HTML = (n: number) => `<html><body>
<page page-num="3"><div class="page" style="background: url(images/mast-${n}.jpg); background-size: 864 768;"></div></page>
</body></html>`;

const ADS_HTML = (n: number) => `<html><body>
<page page-num="2"><div class="page" style="background: url(images/ad-${n}.jpg); background-size: 864 768;"></div></page>
</body></html>`;

const TAIL_HTML = (n: number) => `<html><body>
<page page-num="2"><div class="page" style="background: url(images/tail-${n}-p2.jpg); background-size: 864 768;"></div></page>
<page page-num="72"><div class="page" style="background: url(images/tail-${n}.jpg); background-size: 864 768;"></div></page>
</body></html>`;

const ARCHIVAL_HTML = (n: number, articleIndex: number, pageNum: number) => `<html><body>
<page page-num="${pageNum}"><div class="page" style="background: url(images/arch-${n}-${articleIndex}.jpg); background-size: 864 768;"></div></page>
</body></html>`;

const MANUSCRIPT_HTML = (n: number, articleIndex: number, pageNum: number) => `<html><body>
<page page-num="${pageNum}">
<div class="page">
<img src="images/ms-${n}-${articleIndex}.jpg" width="1024" height="768"/>
</div>
</page>
</body></html>`;

const GALLERY_HTML = (n: number, articleIndex: number, pageNum: number) => `<html><body>
<page page-num="${pageNum}" class="imageGalleryPage">
<div class="page" style="background: url(images/gal-${n}-${articleIndex}.jpg); background-size: 864 768;">
<img src="images/gal-fig-${n}-${articleIndex}.jpg"/>
</div>
</page>
</body></html>`;

function makeMagazine(articleCount: number, issue = 1): Magazine {
    return {
        issue,
        title: 'Test',
        year: 1980,
        articles: Array.from({ length: articleCount }, (_, i) => ({
            name: `Article ${i + 1}`,
            readingUrl: `/issues/${issue}/${i + 1}.ReadingView.html`,
            archiveUrl: `/issues/${issue}/${i + 1}.ArchivalView.html`,
        })),
    };
}

function installFetchStub(files: Record<string, string | null>) {
    const stub = vi.fn(async (url: string) => {
        if (url in files) {
            const body = files[url];
            if (body === null) {
                return new Response('not found', { status: 404 });
            }
            return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response('not found', { status: 404 });
    });
    globalThis.fetch = stub as unknown as typeof fetch;
    return stub;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('buildFullIssueHtml', () => {
    describe('legacy (issue <= FORMAT_THRESHOLD)', () => {
        let stub: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            stub = installFetchStub({
                '/issues/1/cover.html': COVER_HTML(1),
                '/issues/1/masthead.html': MASTHEAD_HTML(1),
                '/issues/1/1.ArchivalView.html': ARCHIVAL_HTML(1, 1, 4),
                '/issues/1/2.ArchivalView.html': ARCHIVAL_HTML(1, 2, 6),
                '/issues/1/tail.html': TAIL_HTML(1),
            });
        });

        it('rejects if cover.html is missing', async () => {
            installFetchStub({});
            const mag = makeMagazine(2);
            await expect(buildFullIssueHtml(1, mag)).rejects.toThrow(/cover\.html/);
        });

        it('tolerates missing optional files (ads, masthead, tail, per-article)', async () => {
            installFetchStub({
                '/issues/2/cover.html': COVER_HTML(2),
                '/issues/2/1.ArchivalView.html': ARCHIVAL_HTML(2, 1, 4),
            });
            const mag = makeMagazine(1, 2);
            const html = await buildFullIssueHtml(2, mag);
            expect(html).toContain('ArchivalView.css');
            expect(html).toContain('cover-2.jpg');
            expect(html).toContain('arch-2-1.jpg');
        });

        it('fetches every expected legacy file in order', async () => {
            const mag = makeMagazine(2);
            await buildFullIssueHtml(1, mag);
            const urls = stub.mock.calls.map((c) => c[0] as string);
            expect(urls).toEqual([
                '/issues/1/cover.html',
                '/issues/1/masthead.html',
                '/issues/1/ads.html',
                '/issues/1/1.ArchivalView.html',
                '/issues/1/2.ArchivalView.html',
                '/issues/1/tail.html',
            ]);
        });

        it('emits a single stitched document with pages in print order: cover → inside front cover → masthead → articles → back covers', async () => {
            const mag = makeMagazine(2);
            const html = await buildFullIssueHtml(1, mag);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const pages = Array.from(doc.querySelectorAll('page')) as HTMLElement[];
            const nums = pages.map((p) => p.getAttribute('page-num'));
            // The page-2 element stored in tail.html is the inside front cover;
            // the stitcher hoists it to position 1 so the document reads in
            // print order: cover (1), inside front cover (2), masthead (3),
            // article pages (4, 6), back cover (72).
            expect(nums).toEqual(['1', '2', '3', '4', '6', '72']);
        });

        it('emits <base href> pointing at the issue folder and the legacy stylesheet', async () => {
            const mag = makeMagazine(1);
            const html = await buildFullIssueHtml(1, mag);
            expect(html).toMatch(/<base\s+href="\/issues\/1\/"/);
            expect(html).toContain('ArchivalView.css');
            expect(html).toContain('reset.css');
            expect(html).not.toContain('Cinefex.css');
        });
    });

    describe('new format (issue > FORMAT_THRESHOLD)', () => {
        it('fetches manuscript + imageGallery per article in order', async () => {
            const stub = installFetchStub({
                '/issues/127/cover.html': COVER_HTML(127),
                '/issues/127/masthead.html': MASTHEAD_HTML(127),
                '/issues/127/ads.html': ADS_HTML(127),
                '/issues/127/manuscript1.html': MANUSCRIPT_HTML(127, 1, 16),
                '/issues/127/imageGallery1.html': GALLERY_HTML(127, 1, 17),
                '/issues/127/manuscript2.html': MANUSCRIPT_HTML(127, 2, 30),
                '/issues/127/imageGallery2.html': GALLERY_HTML(127, 2, 31),
                '/issues/127/tail.html': TAIL_HTML(127),
            });
            const mag = makeMagazine(2, 127);
            await buildFullIssueHtml(127, mag);

            const urls = stub.mock.calls.map((c) => c[0] as string);
            expect(urls).toEqual([
                '/issues/127/cover.html',
                '/issues/127/masthead.html',
                '/issues/127/ads.html',
                '/issues/127/manuscript1.html',
                '/issues/127/imageGallery1.html',
                '/issues/127/manuscript2.html',
                '/issues/127/imageGallery2.html',
                '/issues/127/tail.html',
            ]);
        });

        it('tolerates a missing imageGallery per article (silent skip)', async () => {
            installFetchStub({
                '/issues/127/cover.html': COVER_HTML(127),
                '/issues/127/manuscript1.html': MANUSCRIPT_HTML(127, 1, 16),
                '/issues/127/manuscript2.html': MANUSCRIPT_HTML(127, 2, 30),
            });
            const mag = makeMagazine(2, 127);
            const html = await buildFullIssueHtml(127, mag);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const pages = Array.from(doc.querySelectorAll('page')) as HTMLElement[];
            const nums = pages.map((p) => p.getAttribute('page-num'));
            expect(nums).toEqual(['1', '16', '30']);
        });

        it('emits <base href> and Cinefex.css for the new format', async () => {
            installFetchStub({
                '/issues/128/cover.html': COVER_HTML(128),
                '/issues/128/manuscript1.html': MANUSCRIPT_HTML(128, 1, 16),
            });
            const mag = makeMagazine(1, 128);
            const html = await buildFullIssueHtml(128, mag);
            expect(html).toMatch(/<base\s+href="\/issues\/128\/"/);
            expect(html).toContain('Cinefex.css');
            expect(html).not.toContain('ArchivalView.css');
        });
    });
});
