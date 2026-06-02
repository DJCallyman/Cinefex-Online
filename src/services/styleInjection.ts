import { CONFIG } from '../config';
import { collapseMultiVariantGalleryPages } from './collapseMultiVariant';

const FONT_FACE_CSS = `
    @font-face {
        font-family: "BenguiatStd-Book";
        src: url("/fonts/BenguiatStd-Book.otf") format("opentype");
        font-style: normal;
    }
    @font-face {
        font-family: "BenguiatStd-BookItalic";
        src: url("/fonts/BenguiatStd-BookItalic.otf") format("opentype");
        font-style: italic;
    }
    @font-face {
        font-family: "BenguiatStd-Medium";
        src: url("/fonts/BenguiatStd-Medium.otf") format("opentype");
        font-style: normal;
    }
    @font-face {
        font-family: "BenguiatStd-MediumItalic";
        src: url("/fonts/BenguiatStd-MediumItalic.otf") format("opentype");
        font-style: italic;
    }
    @font-face {
        font-family: "BenguiatStd-Bold";
        src: url("/fonts/BenguiatStd-Bold.otf") format("opentype");
        font-style: normal;
        font-weight: bold;
    }
    @font-face {
        font-family: "GillSansStd";
        src: url("/fonts/GillSansStd.otf") format("opentype");
        font-style: normal;
    }
    @font-face {
        font-family: "GillSansStd-Italic";
        src: url("/fonts/GillSansStd-Italic.otf") format("opentype");
        font-style: italic;
    }
    @font-face {
        font-family: "GillSans-Bold";
        src: url("/fonts/GillSans%20Bold.tt") format("truetype");
        font-weight: bold;
    }
    @font-face {
        font-family: "FuturaStd-ExtraBold";
        src: url("/fonts/FuturaStd-ExtraBold.otf") format("opentype");
        font-weight: bold;
    }
    @font-face {
        font-family: "DucDeBerryLTStd";
        src: url("/fonts/DucDeBerryLTStd.otf") format("opentype");
        font-style: normal;
    }
`;

/**
 * Debug gate for archival view instrumentation (127+ combined layout work).
 * Activated by either:
 *   ?debug=archival in the URL, or
 *   localStorage.cinefexDebugArchival = '1'
 * Per plan defaults (A).
 */
function isArchivalDebugEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.location.search.includes('debug=archival')) return true;
    try {
        return window.localStorage.getItem('cinefexDebugArchival') === '1';
    } catch {
        return false;
    }
}

function debugLog(...args: unknown[]): void {
    if (isArchivalDebugEnabled()) {
        console.log('[CinefexArchival]', ...args);
    }
}

/**
 * Remove or repair malformed SGML comment tags that appear in some 127+ source files:
 *   <!br style="clear:both"/>
 *   <!img ... />
 * The browser treats <! as the start of a comment, which can break the DOM.
 * We convert <!br ...> to a real <br style="clear:both"> and remove <!img ...> entirely.
 */
function sanitizeMalformedComments(doc: Document): void {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
    const nodesToProcess: Comment[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
        nodesToProcess.push(node as Comment);
    }

    for (const comment of nodesToProcess) {
        const text = comment.textContent || '';
        if (/^br\s/i.test(text)) {
            // Replace with a real clearing <br>
            const br = doc.createElement('br');
            br.style.cssText = 'clear:both;';
            comment.parentNode?.replaceChild(br, comment);
        } else if (/^img\s/i.test(text)) {
            // Remove entirely (these are commented-out image buttons in galleries)
            comment.parentNode?.removeChild(comment);
        }
    }
}

/**
 * Repair a rare malformed structure found in a few pre-127 archival HTML files
 * (e.g. issue 3 "Empire Strikes Back" title page).
 *
 * The broken pattern:
 *   <page><div class="page"><div style="width:864px;height:768px;"><div class="page">...</div></div></div></page>
 *
 * Missing closing tags + an extra .page inside the explicit wrapper cause the HTML parser
 * to trap all subsequent <page> siblings inside the first page's clipped box.
 * Result: only the title page is visible; no scrolling to the rest of the article.
 *
 * This fix promotes the real inner plate content up one level and removes the redundant
 * wrapper so the document regains normal block flow for the rest of the pages.
 */
function fixMalformedArchivalPageStructure(doc: Document): void {
    doc.querySelectorAll('page').forEach((pageEl) => {
        const outerPlate = pageEl.firstElementChild as HTMLElement | null;
        if (!outerPlate || !outerPlate.classList.contains('page')) return;

        const wrapper = outerPlate.firstElementChild as HTMLElement | null;
        if (!wrapper || wrapper.tagName !== 'DIV') return;

        const styleAttr = wrapper.getAttribute('style') || '';
        if (!/width:\s*864px/i.test(styleAttr) || !/height:\s*768px/i.test(styleAttr)) return;

        const inner = wrapper.firstElementChild as HTMLElement | null;
        if (!inner) return;

        // Only repair the double-.page case that produces the scroll trap.
        if (inner.classList.contains('page')) {
            // When the source is missing its closing tags, the HTML parser nests every
            // subsequent <page> sibling inside this wrapper, then ignores the </page> end tag.
            // Those trapped pages must be rescued back to document flow BEFORE we remove
            // the wrapper, otherwise the entire rest of the article disappears.
            const rescued: Node[] = [];
            while (wrapper.firstChild) {
                rescued.push(wrapper.removeChild(wrapper.firstChild));
            }

            if (rescued.length > 0) {
                const fragment = doc.createDocumentFragment();
                for (const node of rescued) {
                    fragment.appendChild(node);
                }
                pageEl.parentNode?.insertBefore(fragment, pageEl.nextSibling);
            }

            wrapper.remove();

            // Collapse the now-redundant outerPlate into the inner plate, so the page ends up
            // as a single <page><div class="page">…</div></page> — matching every other
            // well-formed pre-127 page. The outerPlate had no inline size of its own; the
            // inner carries the background image, so we keep inner's class & style and drop
            // outerPlate. This also avoids the "title page zoomed to a corner" symptom caused
            // by the original outerPlate inheriting 864x768 with the inner shrinking to 0.
            if (outerPlate.parentNode) {
                outerPlate.parentNode.replaceChild(inner, outerPlate);
            }
        }
        // Plain <img> cases inside the wrapper are left alone; our CSS already handles them.
    });
}

export function injectStyles(iframe: HTMLIFrameElement, issueNumber: number, isReadingView: boolean): void {
    const doc = iframe.contentDocument;
    if (!doc) return;

    const isOldFormat = issueNumber <= CONFIG.FORMAT_THRESHOLD;
    const isNewFormat = issueNumber > CONFIG.FORMAT_THRESHOLD;

    if (isNewFormat && isReadingView) {
        injectNewReadingViewStyles(doc);
    } else if (isNewFormat && !isReadingView) {
        injectNewArchivalViewStyles(doc);
    } else if (isOldFormat && !isReadingView) {
        injectOldArchivalViewStyles(doc);
    } else if (isOldFormat && isReadingView) {
        injectOldReadingViewStyles(doc);
    }
}

function injectNewReadingViewStyles(doc: Document): void {
    // Do NOT remove the original Cinefex.css for new-format reading views.
    // These files are hybrid (full-bleed image pages + later reflow text) and depend on it.
    // We only provide minimal fixes for fonts, centering, and basic readability.

    const style = doc.createElement('style');
    style.textContent = `
        ${FONT_FACE_CSS}

        html, body {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
        }

        body {
            background-color: #f8f9fa !important;
            color: #1e293b !important;
            padding: 1rem 1.5rem !important;
            max-width: 1024px !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }

        .page {
            font-family: "BenguiatStd-Book", Georgia, serif !important;
            font-size: 16px !important;
            line-height: 28px !important;
            text-align: left !important;
            margin-bottom: 1.25em !important;
        }

        em, i {
            font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
            font-style: italic !important;
        }

        strong, b {
            font-family: "BenguiatStd-Medium", Georgia, serif !important;
            font-weight: normal !important;
        }

        page {
            display: block !important;
            break-inside: avoid !important;
        }

        img {
            max-width: 100% !important;
            height: auto !important;
        }

        .img-all {
            min-height: 660px;
            background-color: #111827;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
        }
    `;

    if (doc.head.firstChild) {
        doc.head.insertBefore(style, doc.head.firstChild);
    } else {
        doc.head.appendChild(style);
    }

    injectTitle(doc);

    // Populate full-bleed magazine page images for empty .img-all containers
    // (these were dynamically supplied by the original iPad app)
    populateNewReadingViewImages(doc);
}

/**
 * For new-format reading views (127+), the article-opening title pages are
 * empty placeholders: <page page-num="88"><div class="page img-all"></div></page>.
 * The original iPad app supplied the full-bleed magazine page image at runtime.
 *
 * The corresponding manuscript ("Original Layout") file is the authoritative
 * source for title images. The imageGallery file contains inline figures
 * (screenshots, photos) that should appear within the text.
 *
 * Both files live in the same issue folder, so relative "images/..." paths
 * resolve identically.
 */
function populateNewReadingViewImages(doc: Document): void {
  // Collect empty .img-all containers keyed by their page-num.
  const titleTargets: { pageNum: string; container: HTMLElement }[] = [];

  doc.querySelectorAll('page').forEach((pageEl) => {
    const imgAll = pageEl.querySelector('.img-all') as HTMLElement | null;
    if (!imgAll) return;
    if (imgAll.querySelector('img') || imgAll.dataset.populatedImage) return;

    const pageNum = pageEl.getAttribute('page-num');
    if (!pageNum) return;

    titleTargets.push({ pageNum, container: imgAll });
  });

  if (titleTargets.length === 0) return;

  // Derive the manuscript and imageGallery URLs from this reading view's URL.
  // e.g. issues/167/readingView4.html -> manuscript4.html + imageGallery4.html
  const readingUrl = doc.URL || doc.location?.href || '';
  const manuscriptUrl = readingUrl.replace(/readingView(\d+)\.html/i, 'manuscript$1.html');
  const imageGalleryUrl = readingUrl.replace(/readingView(\d+)\.html/i, 'imageGallery$1.html');

  if (manuscriptUrl === readingUrl) return;

  // Fetch manuscript for title images.
  fetch(manuscriptUrl)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((html) => {
      const manuscriptDoc = new DOMParser().parseFromString(html, 'text/html');

      const pageImageMap = new Map<string, string>();
      manuscriptDoc.querySelectorAll('page').forEach((pageEl) => {
        const pageNum = pageEl.getAttribute('page-num');
        if (!pageNum || pageImageMap.has(pageNum)) return;
        const img = pageEl.querySelector('img[src]');
        const src = img?.getAttribute('src');
        if (src) pageImageMap.set(pageNum, src);
      });

      for (const { pageNum, container } of titleTargets) {
        const src = pageImageMap.get(pageNum);
        if (src) applyInlineImage(container, src);
      }
    })
    .catch(() => { /* Manuscript unavailable */ });

  // Fetch imageGallery for inline figures to inject into text pages.
  if (imageGalleryUrl !== readingUrl) {
    fetch(imageGalleryUrl)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((html) => {
        const galleryDoc = new DOMParser().parseFromString(html, 'text/html');

        // Build page-num -> inline figure src map (exclude thumbs, buttons, video icons).
        const figureMap = new Map<string, string>();
        galleryDoc.querySelectorAll('page').forEach((pageEl) => {
          const pageNum = pageEl.getAttribute('page-num');
          if (!pageNum || figureMap.has(pageNum)) return;

          pageEl.querySelectorAll('img').forEach((img) => {
            const src = img.getAttribute('src') || '';
            const isFigure = !src.includes('th0') && !src.includes('button-') && !src.includes('video_icon');
            if (isFigure) figureMap.set(pageNum, src);
          });
        });

        // Inject figures into matching text pages.
        doc.querySelectorAll('page').forEach((pageEl) => {
          const pageNum = pageEl.getAttribute('page-num');
          if (!pageNum) return;
          const figureSrc = figureMap.get(pageNum);
          if (!figureSrc) return;

          const pageDiv = pageEl.querySelector('.page') as HTMLElement | null;
          if (!pageDiv) return;

          applyFigureToTextPage(pageDiv, figureSrc);
        });
      })
      .catch(() => { /* imageGallery unavailable */ });
  }
}

/**
 * Appends an inline figure image (screenshot, photo) from the imageGallery
 * to the bottom of a text page's .page div.
 */
function applyFigureToTextPage(container: HTMLElement, src: string): void {
  if (container.dataset.populatedFigure) return;
  container.dataset.populatedFigure = 'true';

  const img = container.ownerDocument.createElement('img');
  img.src = src;
  img.loading = 'lazy';
  img.alt = '';
  img.style.cssText = 'display:block;width:100%;height:auto;margin:1.5rem auto 0 auto;';

  img.addEventListener('error', () => {
    delete container.dataset.populatedFigure;
    if (img.parentNode === container) container.removeChild(img);
  });

  container.appendChild(img);
}

/**
 * Inserts a real <img> into an empty .img-all title-page container.
 */
function applyInlineImage(container: HTMLElement, src: string): void {
  if (container.dataset.populatedImage) return;
  container.dataset.populatedImage = 'true';

  const img = container.ownerDocument.createElement('img');
  img.src = src;
  img.loading = 'lazy';
  img.alt = '';
  img.style.cssText = 'display:block;width:100%;height:auto;margin:0 auto;';

  img.addEventListener('error', () => {
    delete container.dataset.populatedImage;
    if (img.parentNode === container) container.removeChild(img);
  });

  container.style.backgroundColor = 'transparent';
  container.style.minHeight = '0';
  container.appendChild(img);
}



function injectNewArchivalViewStyles(doc: Document): void {
    // New-format archival (manuscript*.html) = fixed 1024x768 page-image spreads.
    // For 127+ this may be a combined document (manuscript + imageGallery pages appended).
    // Be extremely conservative: center everything, let the original Cinefex.css
    // handle the page-image presentation, only add light container fixes.

    // Sanitize any remaining malformed SGML comments (<!br ...> and <!img ...>)
    // that can appear in both manuscript and gallery source files.
    sanitizeMalformedComments(doc);

    const style = doc.createElement('style');
    style.textContent = `
        html {
            margin: 0 !important;
            padding: 0 !important;
            background: #1a1a2e !important;
            overflow: auto !important;
        }

        body {
            margin: 0 !important;
            padding: 20px !important;
            background: #1a1a2e !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
        }

        page {
            display: block !important;
            margin: 0 auto 20px auto !important;
            width: 1024px !important;
            float: none !important;
        }

        .page {
            float: none !important;
            display: block !important;
            margin: 0 auto !important;
            box-shadow: 0 4px 30px rgba(0,0,0,0.6) !important;
            border-radius: 4px !important;
            background-size: 1024px 768px !important;
            position: relative !important;
        }

        .page > div {
            float: none !important;
            display: block !important;
        }

        img {
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            display: block !important;
        }
    `;
    doc.head.appendChild(style);
}

function injectOldArchivalViewStyles(doc: Document): void {
    // Repair rare malformed page structures in a few pre-127 archival files
    // (e.g. issue 3 Empire Strikes Back title page) before applying styles.
    // This fixes the "only title page visible, no scroll" bug.
    fixMalformedArchivalPageStructure(doc);

    const style = doc.createElement('style');
    style.textContent = `
        html, body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #1a1a2e !important;
            overflow: auto !important;
        }

        body {
            padding: 20px !important;
        }

        page {
            display: block !important;
            margin: 0 auto 20px auto !important;
            width: 864px !important;
            float: none !important;
        }

        /* Plate container: only style .page elements that are direct children of <page>.
           This avoids breaking rare malformed pages that nest an extra .page inside
           a width/height wrapper (e.g. issue 3 Empire Strikes Back title page). */
        page > .page {
            float: none !important;
            display: block !important;
            margin: 0 auto !important;
            width: 864px !important;
            height: 768px !important;
            min-height: 768px !important;
            max-height: 768px !important;
            box-shadow: 0 4px 30px rgba(0,0,0,0.6) !important;
            border-radius: 4px !important;
            background-size: 864px 768px !important;
            background-repeat: no-repeat !important;
            background-position: center top !important;
            position: relative !important;
            overflow: hidden !important;
        }

        /* The malformed double-.page wrapper on full-bleed image-only title pages
           (e.g. issue 3 Empire Strikes Back p4) is collapsed in
           fixMalformedArchivalPageStructure() into a single <page><div class="page">…
           matching every other pre-127 page, so the page > .page rule above sizes it
           correctly. The legacy 3-level selector below is kept as a safety net for any
           future pre-127 source file that happens to ship with the same double-.page
           nesting still intact (no repair triggered). */
        page > .page > div > .page {
            height: 100% !important;
            min-height: 0 !important;
            max-height: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            float: none !important;
        }

        /* Full-bleed single-image pages: the <img> is inside the explicit wrapper div */
        page > .page > div > img {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            position: relative !important;
        }

        /* Multi-image layout pages: images fill their explicit-sized container divs */
        page > .page div > div > img {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            position: relative !important;
        }
    `;
    doc.head.appendChild(style);
}

function injectOldReadingViewStyles(doc: Document): void {
    const style = doc.createElement('style');
    style.textContent = `
        ${FONT_FACE_CSS}

        body {
            font-family: "BenguiatStd-Book", Georgia, serif !important;
        }

        em, i {
            font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
            font-style: italic !important;
        }

        strong, b {
            font-family: "BenguiatStd-Medium", Georgia, serif !important;
            font-weight: normal !important;
        }

        articleTitle {
            font-family: "BenguiatStd-Medium", Georgia, serif !important;
            font-weight: normal !important;
        }

        .dropCap span {
            font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
        }

        page {
            display: block !important;
        }

        .footer {
            clear: both !important;
            margin-top: 2em !important;
        }

        body::after {
            content: "" !important;
            display: block !important;
            clear: both !important;
        }
    `;
    doc.head.appendChild(style);
}

function injectTitle(doc: Document): void {
    const dcTitle = doc.querySelector('meta[name="dc:Title"]');
    const filmMeta = doc.querySelector('meta[name="Film"]');
    const creatorMeta = doc.querySelector('meta[name="Creator"]');

    let titleText: string | null = null;

    if (dcTitle) {
        titleText = dcTitle.getAttribute('content');
    } else if (filmMeta) {
        titleText = filmMeta.getAttribute('content') ?? null;
    } else if (creatorMeta) {
        titleText = `Article by ${creatorMeta.getAttribute('content')}`;
    }

    if (titleText && doc.body) {
        const existingH1 = doc.querySelector('h1.injected-title');
        if (existingH1) existingH1.remove();

        const h1 = doc.createElement('h1');
        h1.className = 'injected-title';
        h1.textContent = titleText;
        h1.style.cssText = `
            font-size: 2.5rem;
            font-weight: bold;
            margin: 1.5rem 0;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 0.5rem;
            text-align: left;
        `;
        doc.body.insertBefore(h1, doc.body.firstChild);
    }
}

/**
 * Append image gallery pages to a new-format archival view (127+).
 * This is the core of Path A: we fetch the gallery HTML at runtime and
 * concatenate its <page> elements into the already-loaded manuscript iframe.
 *
 * Called from ArticleViewer after injectStyles for !isReadingView && issue > 126.
 * Gracefully degrades if gallery is missing or fetch fails (silent per plan default C).
 */
export function appendImageGalleryToArchival(
    iframe: HTMLIFrameElement,
    galleryUrl: string
): void {
    const doc = iframe.contentDocument;
    if (!doc) return;

    const issueMatch = galleryUrl.match(/issues\/(\d+)\//);
    const issueNum = issueMatch ? issueMatch[1] : '???';

    debugLog(`Starting gallery append for issue ${issueNum}: ${galleryUrl}`);

    fetch(galleryUrl)
        .then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return res.text();
        })
        .then((html) => {
            const galleryDoc = new DOMParser().parseFromString(html, 'text/html');

            // Collect all <page> elements from the gallery (these are the photo spreads)
            const galleryPages = Array.from(galleryDoc.querySelectorAll('page'));

            if (galleryPages.length === 0) {
                debugLog(`Issue ${issueNum}: gallery had 0 pages, nothing to append`);
                return;
            }

            // Sanitize any malformed comments inside the gallery fragment before cloning
            sanitizeMalformedComments(galleryDoc);

            // Append clones so we don't move nodes out of the parsed document
            const fragment = doc.createDocumentFragment();
            for (const page of galleryPages) {
                const clone = page.cloneNode(true) as HTMLElement;
                fragment.appendChild(clone);
            }

            doc.body.appendChild(fragment);

            debugLog(`Issue ${issueNum}: appended ${galleryPages.length} gallery pages (total pages now ${doc.querySelectorAll('page').length})`);

            // Collapse multi-variant photo spreads (e.g. p75.1–p75.4 in Kong) into single interactive pages
            // with working thumbnail switchers. Runs on the combined document after gallery pages are appended.
            collapseMultiVariantGalleryPages(doc);

            // Re-apply base archival styling (safe to call multiple times).
            injectNewArchivalViewStyles(doc);

            // Apply the additional gallery-specific polish (hiding chrome, proper .imageGalleryPage treatment, etc.).
            // This is the "styling polish" half of "do both" (plan Phase 4).
            enhanceCombinedArchivalStyles(doc);
        })
        .catch((err) => {
            // Silent degradation per plan default C — only log when debug is on
            debugLog(`Issue ${issueNum}: gallery fetch failed or unavailable — ${err}. Continuing with manuscript only.`);
        });
}

/**
 * Enhance archival styling for combined 127+ views (manuscript + appended gallery pages).
 * Extends the base rules already injected by injectNewArchivalViewStyles.
 * Called automatically at the end of appendImageGalleryToArchival, and also safe to call on pure manuscripts.
 */
export function enhanceCombinedArchivalStyles(doc: Document): void {
    // We intentionally keep this light — the heavy lifting is already done by the base injector.
    // Here we only add/override rules that are specific to the gallery markup we now append.

    const style = doc.createElement('style');
    style.textContent = `
        /* Gallery photo-spread containers (127+ imageGallery*.html) */
        .imageGalleryPage {
            display: block !important;
            width: 1024px !important;
            height: 768px !important;
            margin: 0 auto 20px auto !important;
            box-shadow: 0 4px 30px rgba(0,0,0,0.6) !important;
            border-radius: 4px !important;
            background-size: 1024px 768px !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            position: relative !important;
            overflow: hidden !important;
        }

        /* The photo that is dropped onto the page plate — respect authored margins */
        .imageGalleryPage > div > img,
        .imageGalleryPage img {
            max-width: none !important; /* allow the authored pixel margins to work */
            height: auto !important;
            display: block !important;
        }

        /* Hide all the iPad-era gallery chrome (video buttons, thumbs, etc.) */
        .new_button-left,
        .new_button-top,
        .new_button-top-2,
        .button-left,
        .button-left-2,
        .button-top,
        .button-top-2,
        .thumbs,
        .new_button-left a,
        .thumbs a {
            display: none !important;
        }

        /* A few other classes that appear in some galleries and can cause noise */
        .gallery,
        .header,
        .logo,
        .filmTitle,
        .filmTitleTop {
            display: none !important;
        }

        /* Functional thumbnail switcher for multi-variant photo spreads (e.g. 4 versions on p75 for Kong).
           Compact 2x2 grid in the bottom-right corner of the plate. */
        .variant-thumbs {
            display: flex !important;
            flex-wrap: wrap !important;
            flex-direction: row !important;
            width: 63px !important;
            position: absolute !important;
            right: 14px !important;
            bottom: 12px !important;
            gap: 3px !important;
            z-index: 30 !important;
            background: rgba(0,0,0,0.45) !important;
            padding: 2px !important;
            border-radius: 2px !important;
        }

        .variant-thumbs button {
            border: 1px solid rgba(255,255,255,0.5) !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            cursor: pointer !important;
            width: 30px !important;
            height: 22px !important;
            overflow: hidden !important;
            border-radius: 1px !important;
            opacity: 0.75 !important;
            transition: opacity 0.1s ease, border-color 0.1s ease, transform 0.1s ease !important;
            flex-shrink: 0 !important;
        }

        .variant-thumbs button:hover {
            opacity: 1 !important;
            transform: scale(1.05) !important;
        }

        .variant-thumbs button[aria-pressed="true"],
        .variant-thumbs button:active {
            opacity: 1 !important;
            border-color: #fff !important;
        }

        .variant-thumbs img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
        }
    `;

    // Insert early so it can be overridden by more specific rules if needed
    if (doc.head.firstChild) {
        doc.head.insertBefore(style, doc.head.firstChild);
    } else {
        doc.head.appendChild(style);
    }
}
