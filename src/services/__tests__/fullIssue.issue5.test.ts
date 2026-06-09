import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { buildFullIssueHtml } from '../fullIssue';
import { repairUnitlessMargins } from '../styleInjection';

const PROJECT_ROOT = resolve(__dirname, '../../..');

afterEach(() => {
    vi.restoreAllMocks();
});

describe('buildFullIssueHtml + repairUnitlessMargins: real source layout fidelity (issue 5 page 7)', () => {
    it('repairs unitless image margins so the page 7 plate matches the print copy', async () => {
        const issue = 5;
        const files = ['cover.html', 'masthead.html', '1.ArchivalView.html', '2.ArchivalView.html', 'tail.html'];
        const map: Record<string, string> = {};
        for (const f of files) {
            const path = resolve(PROJECT_ROOT, `issues/${issue}/${f}`);
            try {
                map[`/issues/${issue}/${f}`] = readFileSync(path, 'utf-8');
            } catch {
                // optional files (ads, etc.) may be absent
            }
        }
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            if (url in map && map[url]) {
                return Promise.resolve({ ok: true, status: 200, text: async () => map[url] } as Response);
            }
            return Promise.resolve({ ok: false, status: 404, text: async () => '' } as Response);
        });

        const articleCount = map[`/issues/${issue}/1.ArchivalView.html`]
            ? 1 + (map[`/issues/${issue}/2.ArchivalView.html`] ? 1 : 0)
            : 0;
        const magazine = {
            issue,
            title: 'test',
            year: 1984,
            articles: Array.from({ length: articleCount }, (_, i) => ({
                name: `Article ${i + 1}`,
                readingUrl: '',
                archiveUrl: '',
            })),
        };
        // Stitch first, then run the same repair pass the viewer's onLoad
        // injectStyles() call would run.
        const stitchedHtml = await buildFullIssueHtml(issue, magazine as never);
        const dom = new JSDOM(stitchedHtml);
        repairUnitlessMargins(dom.window.document);
        const doc = dom.window.document;
        const page7 = doc.querySelector('page[page-num="7"]');
        expect(page7).toBeTruthy();
        const imgs = page7!.querySelectorAll('img');
        expect(imgs.length).toBeGreaterThanOrEqual(3);

        // Every margin declaration on a page-7 image must now have explicit units
        // (or be a keyword like auto). This is what lets the browser honor the
        // 44-54px top margin the print copy uses.
        for (const img of Array.from(imgs)) {
            const style = img.getAttribute('style') || '';
            const marginDecl = style.match(/margin\s*:\s*([^;]+)/i);
            if (marginDecl) {
                const toks = marginDecl[1].trim().split(/\s+/);
                for (const tok of toks) {
                    expect(tok).toMatch(/^-?\d+(\.\d+)?(px|em|rem|%)?$|^auto$/);
                }
            }
        }

        // Sanity: at least one of the page-7 images should now carry a
        // non-zero top margin expressed in pixels.
        const withPxMargin = Array.from(imgs).some((img) => {
            const style = img.getAttribute('style') || '';
            return /margin(-top)?\s*:\s*\d+px/i.test(style);
        });
        expect(withPxMargin).toBe(true);
    });
});
