import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullIssueHtml } from '../fullIssue';
import { Magazine } from '../../types';

const PROJECT_ROOT = resolve(__dirname, '../../..');

function loadIssueFile(issue: number, file: string): string {
    return readFileSync(resolve(PROJECT_ROOT, `issues/${issue}/${file}`), 'utf-8');
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('buildFullIssueHtml: unitless-length normalization', () => {
    beforeEach(() => {
        const issue = 5;
        // Stub fetches to return the real on-disk files
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            const known = [
                'cover.html',
                'masthead.html',
                'ads.html',
                '1.ArchivalView.html',
                '2.ArchivalView.html',
                'tail.html',
            ];
            for (const f of known) {
                if (url.endsWith(`/${f}`)) {
                    try {
                        const text = loadIssueFile(issue, f);
                        return Promise.resolve({
                            ok: true,
                            status: 200,
                            text: async () => text,
                        } as Response);
                    } catch {
                        return Promise.resolve({ ok: false, status: 404, text: async () => '' } as Response);
                    }
                }
            }
            return Promise.resolve({ ok: false, status: 404, text: async () => '' } as Response);
        });
    });

    it('normalizes `margin: 44 0 0 0;` to `margin: 44px 0 0 0;`', async () => {
        const mag: Magazine = {
            issue: 5,
            title: 'test',
            year: 1981,
            articles: [{ name: 'A', readingUrl: '', archiveUrl: '' }],
        };
        const html = await buildFullIssueHtml(5, mag);
        // The original source has these raw unitless margins; after stitching
        // they should have `px` appended to non-zero numbers.
        expect(html).toMatch(/margin:\s*44px\s+0(?:\s+0)?/);
        expect(html).toMatch(/margin:\s*54px\s+0/);
        // And `0` is preserved unitless (CSS allows it).
        expect(html).not.toMatch(/margin:\s*44px\s+0px\s+0px\s+0px/);
    });

    it('preserves valid CSS (px, %, em) in the stitched output', async () => {
        const mag: Magazine = {
            issue: 5,
            title: 'test',
            year: 1981,
            articles: [{ name: 'A', readingUrl: '', archiveUrl: '' }],
        };
        const html = await buildFullIssueHtml(5, mag);
        // The source has `width: 290px;` etc. which should be unchanged.
        expect(html).toMatch(/width:\s*290px/);
        expect(html).toMatch(/height:\s*340px/);
        // The source has `background-size: 864 768;` (unitless) on the page plate.
        // After normalization this becomes `background-size: 864px 768px;`.
        expect(html).toMatch(/background-size:\s*864px\s+768px/);
    });

    it('does not double-px numbers that already have a unit', async () => {
        const mag: Magazine = {
            issue: 5,
            title: 'test',
            year: 1981,
            articles: [{ name: 'A', readingUrl: '', archiveUrl: '' }],
        };
        const html = await buildFullIssueHtml(5, mag);
        expect(html).not.toMatch(/\b290pxpx\b/);
        expect(html).not.toMatch(/\b864pxpx\b/);
    });
});
