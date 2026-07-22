import { CONFIG } from '../config';
import { collapseMultiVariantGalleryPages } from './collapseMultiVariant';
import { enhanceVideoLinks } from './videoModal';
import { FONT_FACE_CSS } from '../styles/fonts';
import {
    NEW_READING_CSS,
    NEW_ARCHIVAL_CSS,
    OLD_READING_CSS,
    OLD_ARCHIVAL_CSS,
    COMBINED_ARCHIVAL_CSS,
} from './iframeStyles';

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
export function sanitizeMalformedComments(doc: Document): void {
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
 * Exported for unit testing.
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
export function fixMalformedArchivalPageStructure(doc: Document): void {
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
        injectNewReadingViewStyles(doc, iframe);
    } else if (isNewFormat && !isReadingView) {
        injectNewArchivalViewStyles(doc);
    } else if (isOldFormat && !isReadingView) {
        injectOldArchivalViewStyles(doc);
    } else if (isOldFormat && isReadingView) {
        injectOldReadingViewStyles(doc);
    }
}

/**
 * Inject a `<style>` element with a stable id, removing any pre-existing
 * element with the same id first. This prevents style-sheet accumulation
 * when `injectStyles` is called more than once on the same document
 * (e.g. during iframe reloads or repeated debug invocations), which would
 * otherwise pile up duplicate `<style>` blocks in `<head>` and waste memory.
 */
function injectStyleBlock(doc: Document, id: string, css: string): void {
    const existing = doc.getElementById(id);
    if (existing) existing.remove();

    const style = doc.createElement('style');
    style.id = id;
    style.textContent = css;

    // Insert at the top of <head> so our overrides win against the
    // publisher's linked stylesheets that follow, matching the original
    // insertBefore-firstChild behaviour. Fall back to appendChild if
    // <head> is empty.
    if (doc.head.firstChild) {
        doc.head.insertBefore(style, doc.head.firstChild);
    } else {
        doc.head.appendChild(style);
    }
}

function injectNewReadingViewStyles(doc: Document, iframe: HTMLIFrameElement): void {
    // Do NOT remove the original Cinefex.css for new-format reading views.
    // These files are hybrid (full-bleed image pages + later reflow text) and depend on it.
    // We only provide minimal fixes for fonts, centering, and basic readability.

    injectStyleBlock(doc, 'cinefex-new-reading-styles', `${FONT_FACE_CSS}\n\n${NEW_READING_CSS}`);

    injectTitle(doc);

    // Populate full-bleed magazine page images for empty .img-all containers
    // (these were dynamically supplied by the original iPad app)
    populateNewReadingViewImages(doc, iframe);
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
function populateNewReadingViewImages(doc: Document, iframe: HTMLIFrameElement): void {
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
  // The regex is anchored to end-of-string so a stray "readingView123.html"
  // appearing earlier in the URL (e.g. in a query param) can't match.
  const readingUrl = doc.URL || doc.location?.href || '';
  const manuscriptUrl = readingUrl.replace(/readingView(\d+)\.html$/i, 'manuscript$1.html');
  const imageGalleryUrl = readingUrl.replace(/readingView(\d+)\.html$/i, 'imageGallery$1.html');

  if (manuscriptUrl === readingUrl) {
    debugLog(`populateNewReadingViewImages: URL did not match readingView<N>.html pattern; skipping. URL=${readingUrl}`);
    return;
  }

  // Fetch manuscript for title images.
  fetch(manuscriptUrl)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((html) => {
      // Staleness guard: if the user navigated to another article before the
      // fetch resolved, the iframe now holds a different document. Mutating the
      // captured `doc` would write into a dead document (silently lost images)
      // and could throw if the document was unloaded. Bail out in that case.
      if (iframe.contentDocument !== doc) {
        debugLog('populateNewReadingViewImages: manuscript fetch resolved after navigation; skipping.');
        return;
      }

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
        // Staleness guard (see manuscript fetch above).
        if (iframe.contentDocument !== doc) {
          debugLog('populateNewReadingViewImages: imageGallery fetch resolved after navigation; skipping.');
          return;
        }

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

    injectStyleBlock(doc, 'cinefex-new-archival-styles', NEW_ARCHIVAL_CSS);

    // Make ns://Video/ links in the manuscript page image maps playable.
    enhanceVideoLinks(doc);
}

function injectOldArchivalViewStyles(doc: Document): void {
    // Repair rare malformed page structures in a few pre-127 archival files
    // (e.g. issue 3 Empire Strikes Back title page) before applying styles.
    // This fixes the "only title page visible, no scroll" bug.
    fixMalformedArchivalPageStructure(doc);

    injectStyleBlock(doc, 'cinefex-old-archival-styles', OLD_ARCHIVAL_CSS);
}

function injectOldReadingViewStyles(doc: Document): void {
    injectStyleBlock(doc, 'cinefex-old-reading-styles', `${FONT_FACE_CSS}\n\n${OLD_READING_CSS}`);
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
            // Staleness guard: if the user navigated to another article before
            // the gallery fetch resolved, the iframe now holds a different
            // document. Mutating the captured `doc` would write into a dead
            // document and could throw. Bail out in that case.
            if (iframe.contentDocument !== doc) {
                debugLog(`Issue ${issueNum}: gallery fetch resolved after navigation; skipping append.`);
                return;
            }

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

            // Make any ns://Video/ links in the appended gallery pages playable.
            enhanceVideoLinks(doc);
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
    //
    // Use injectStyleBlock with a stable id so repeated calls (e.g. when
    // appendImageGalleryToArchival runs more than once on the same document)
    // replace the existing block instead of accumulating duplicate <style>
    // elements in <head>.
    injectStyleBlock(doc, 'cinefex-combined-archival-styles', COMBINED_ARCHIVAL_CSS);
}
