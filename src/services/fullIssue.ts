import { CONFIG } from '../config';
import { Magazine } from '../types';
import {
    sanitizeMalformedComments,
    fixMalformedArchivalPageStructure,
} from './styleInjection';
import { collapseMultiVariantGalleryPages } from './collapseMultiVariant';

async function fetchOptional(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

async function fetchRequired(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch required file: ${url} (HTTP ${res.status})`);
    return res.text();
}

interface CollectedPages {
    /**
     * Pages that physically belong right after the front cover (page-num="2",
     * the inside front cover). The iPad source data stores these in tail.html
     * for some pre-127 issues; we pull them out so the stitched document
     * reads in print order: cover, inside front cover, masthead, articles,
     * inside back cover, back cover.
     */
    frontInsideCover: HTMLElement[];
    /** All other pages, in document order. */
    rest: HTMLElement[];
}

function parseAndCollectPages(
    html: string,
    parser: DOMParser,
    sanitize: boolean,
    fixLegacyStructure: boolean,
): CollectedPages {
    const doc = parser.parseFromString(html, 'text/html');
    if (sanitize) sanitizeMalformedComments(doc);
    if (fixLegacyStructure) fixMalformedArchivalPageStructure(doc);
    const frontInsideCover: HTMLElement[] = [];
    const rest: HTMLElement[] = [];
    for (const page of Array.from(doc.querySelectorAll('page')) as HTMLElement[]) {
        if (page.getAttribute('page-num') === '2') {
            frontInsideCover.push(page);
        } else {
            rest.push(page);
        }
    }
    return { frontInsideCover, rest };
}

/**
 * Build a single HTML document for the "Full Issue" view by stitching the
 * cover, masthead, ads (if present), each article's original-layout (archival /
 * manuscript + optional gallery) pages, and the tail into one body. The result
 * is intended to be loaded into an iframe via `srcdoc` so the runtime
 * `injectStyles(iframe, issueNumber, false)` call still applies the
 * format-appropriate CSS.
 *
 * For 127+ issues the gallery pages of each article are appended immediately
 * after the matching manuscript pages, and multi-variant photo spreads are
 * collapsed exactly as `appendImageGalleryToArchival` does for a single
 * article.
 *
 * 404s on optional files (ads, gallery) are swallowed; only `cover.html` is
 * required.
 */
export async function buildFullIssueHtml(
    issueNumber: number,
    magazine: Magazine,
    parser: DOMParser = new DOMParser(),
): Promise<string> {
    const isLegacy = issueNumber <= CONFIG.FORMAT_THRESHOLD;
    const cssFile = isLegacy ? 'ArchivalView.css' : 'Cinefex.css';

    const coverHtml = await fetchRequired(`/issues/${issueNumber}/cover.html`);
    // Pages in document order, but excluding any page-num="2" (the inside
    // front cover) which is collected separately so we can slot it in right
    // after the cover for proper print order.
    const pages: HTMLElement[] = [];
    let insideFrontCover: HTMLElement[] = [];

    const coverPages = parseAndCollectPages(
        coverHtml,
        parser,
        /* sanitize */ true,
        /* fixLegacyStructure */ isLegacy,
    );
    pages.push(...coverPages.rest);
    // The cover source is unlikely to contain a page-2 element, but if it
    // does (defensive), use it as the inside front cover.
    if (coverPages.frontInsideCover.length > 0) {
        insideFrontCover = coverPages.frontInsideCover;
    }

    const mastheadHtml = await fetchOptional(`/issues/${issueNumber}/masthead.html`);
    if (mastheadHtml) {
        const m = parseAndCollectPages(mastheadHtml, parser, true, isLegacy);
        pages.push(...m.rest);
        if (insideFrontCover.length === 0 && m.frontInsideCover.length > 0) {
            insideFrontCover = m.frontInsideCover;
        }
    }

    const adsHtml = await fetchOptional(`/issues/${issueNumber}/ads.html`);
    if (adsHtml) {
        const a = parseAndCollectPages(adsHtml, parser, true, isLegacy);
        pages.push(...a.rest);
        if (insideFrontCover.length === 0 && a.frontInsideCover.length > 0) {
            insideFrontCover = a.frontInsideCover;
        }
    }

    for (let i = 0; i < magazine.articles.length; i++) {
        const articleFile = isLegacy
            ? `${i + 1}.ArchivalView.html`
            : `manuscript${i + 1}.html`;
        const articleHtml = await fetchOptional(`/issues/${issueNumber}/${articleFile}`);
        if (articleHtml) {
            const r = parseAndCollectPages(articleHtml, parser, true, isLegacy);
            pages.push(...r.rest);
            if (insideFrontCover.length === 0 && r.frontInsideCover.length > 0) {
                insideFrontCover = r.frontInsideCover;
            }
        }

        if (!isLegacy) {
            const galleryHtml = await fetchOptional(
                `/issues/${issueNumber}/imageGallery${i + 1}.html`,
            );
            if (galleryHtml) {
                const g = parseAndCollectPages(galleryHtml, parser, true, false);
                pages.push(...g.rest);
                if (insideFrontCover.length === 0 && g.frontInsideCover.length > 0) {
                    insideFrontCover = g.frontInsideCover;
                }
            }
        }
    }

    const tailHtml = await fetchOptional(`/issues/${issueNumber}/tail.html`);
    if (tailHtml) {
        const t = parseAndCollectPages(tailHtml, parser, true, isLegacy);
        pages.push(...t.rest);
        if (insideFrontCover.length === 0 && t.frontInsideCover.length > 0) {
            insideFrontCover = t.frontInsideCover;
        }
    }

    // Slot the inside front cover pages immediately after the cover (index 1)
    // so the stitched document reads in print order. If the cover source had
    // no pages (shouldn't happen in practice), fall back to the front.
    if (insideFrontCover.length > 0) {
        const insertAt = pages.length > 0 ? 1 : 0;
        pages.splice(insertAt, 0, ...insideFrontCover);
    }

    if (!isLegacy) {
        const combinedDoc = parser.parseFromString(
            `<!doctype html><html><body></body></html>`,
            'text/html',
        );
        for (const page of pages) {
            combinedDoc.body.appendChild(combinedDoc.importNode(page, true));
        }
        collapseMultiVariantGalleryPages(combinedDoc);
        const finalPages = Array.from(combinedDoc.querySelectorAll('page')) as HTMLElement[];
        return renderDocument(issueNumber, cssFile, finalPages, parser);
    }

    return renderDocument(issueNumber, cssFile, pages, parser);
}

function renderDocument(
    issueNumber: number,
    cssFile: string,
    pages: HTMLElement[],
    parser: DOMParser,
): string {
    // Match the single-article DOM shape exactly: <body> holds the <page>
    // elements directly with no wrapper. The viewer's onLoad call to
    // injectStyles() applies the format-appropriate layout CSS (oldArchival /
    // newArchival + combined) exactly as it does for the per-article viewer.
    const doc = parser.parseFromString(
        `<!doctype html><html><head><meta charset="utf-8"/><base href="/issues/${issueNumber}/"/><link rel="stylesheet" type="text/css" href="reset.css"/><link rel="stylesheet" type="text/css" href="${cssFile}"/><meta name="viewport" content="width = 1024"/></head><body></body></html>`,
        'text/html',
    );
    for (const page of pages) {
        doc.body.appendChild(doc.importNode(page, true));
    }
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
