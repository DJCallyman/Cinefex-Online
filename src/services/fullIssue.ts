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
    // The publisher's source XHTML uses unitless numbers in CSS length
    // properties (e.g. `margin: 44 0 0 0;` instead of `margin: 44px 0 0 0px;`).
    // The iPad app that produced this data was permissive about unitless
    // lengths, but HTML5 spec-compliant browsers reject the whole declaration
    // when any value is invalid, so margins/widths collapse to zero and
    // multi-image plates lose their top padding. Normalize them here so the
    // stitched document renders with the same spacing as the print magazine.
    normalizeUnitlessLengths(doc);
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
 * CSS properties that accept `<length>` values. We only normalize values in
 * these properties; other properties (e.g. `z-index`, `opacity`, `line-height`)
 * legitimately take unitless numbers.
 */
const LENGTH_PROPS = [
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'margin-block',
    'margin-inline',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'padding-block',
    'padding-inline',
    'width',
    'min-width',
    'max-width',
    'height',
    'min-height',
    'max-height',
    'top',
    'right',
    'bottom',
    'left',
    'inset',
    'inset-block',
    'inset-inline',
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-width',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-radius',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'outline',
    'outline-width',
    'outline-offset',
    'background-size',
    'background-position',
    'transform',
    'translate',
    'text-indent',
    'letter-spacing',
    'word-spacing',
    'font-size',
    'line-height',
    'gap',
    'row-gap',
    'column-gap',
    'grid-gap',
    'grid-row-gap',
    'grid-column-gap',
];

/**
 * Walk the document and rewrite every `style` attribute so that unitless
 * non-zero numbers inside length-accepting properties get a `px` suffix.
 * `0` is left as-is (unitless zero is valid CSS).
 *
 * This is scoped to the inline `style` attribute; the publisher's linked
 * stylesheets are loaded untouched and parsed by the browser normally.
 */
function normalizeUnitlessLengths(doc: Document): void {
    const elements = doc.body.querySelectorAll('[style]');
    for (const el of Array.from(elements)) {
        const original = el.getAttribute('style');
        if (!original) continue;
        const rewritten = normalizeStyleString(original);
        if (rewritten !== original) {
            el.setAttribute('style', rewritten);
        }
    }
}

function normalizeStyleString(style: string): string {
    // Split on `;` to handle declarations independently. A property whose
    // entire value-list contains a unitless non-zero number in a length
    // context is rewritten with `px` appended to each such number.
    const declarations = style.split(';');
    const out: string[] = [];
    for (const decl of declarations) {
        const trimmed = decl.trim();
        if (!trimmed) {
            out.push('');
            continue;
        }
        const colon = trimmed.indexOf(':');
        if (colon === -1) {
            out.push(trimmed);
            continue;
        }
        const prop = trimmed.slice(0, colon).trim().toLowerCase();
        const value = trimmed.slice(colon + 1).trim();
        if (LENGTH_PROPS.includes(prop) || isShorthandLengthProp(prop)) {
            out.push(`${prop}: ${normalizeLengthValue(value)}`);
        } else {
            out.push(trimmed);
        }
    }
    return out.join(';').replace(/;+/g, ';').replace(/;+\s*$/, '');
}

/**
 * The 4-value `margin`/`padding` shorthand and `border-radius` can each
 * contain length values. We treat any property whose name includes a
 * length-accepting keyword as length-bearing for normalization.
 */
function isShorthandLengthProp(prop: string): boolean {
    return (
        prop === 'margin' ||
        prop === 'padding' ||
        prop === 'border' ||
        prop === 'border-radius' ||
        prop === 'outline' ||
        prop === 'inset' ||
        prop === 'background' ||
        prop === 'translate'
    );
}

/**
 * For a CSS value string (the right-hand side of `prop: value;`), append
 * `px` to any unitless number that isn't `0` and isn't part of a known
 * unitless context (like a slash-separated ratio, a calc(), etc.).
 */
function normalizeLengthValue(value: string): string {
    // Split on whitespace; for each token, if it's a bare number (signed
    // integer or float) that isn't `0`, append `px`. Tokens with units, parens,
    // commas, or other punctuation are passed through.
    return value.replace(/(^|[\s,(])(-?\d+(?:\.\d+)?)(?=[\s,)]|$)/g, (match, lead, num) => {
        if (parseFloat(num) === 0) return match;
        return `${lead}${num}px`;
    });
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
