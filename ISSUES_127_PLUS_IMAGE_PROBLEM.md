# Cinefex Online — New Format (Issues 127+) Image Display Problem

**Status**: Partial progress. Fatal load errors resolved. Image display in new-format Reading Views remains broken.

**Date of handoff**: May 2026

---

## Problem Summary

Starting with issue 127, the digitized Cinefex magazines changed structure significantly:

### Old Format (Issues 1–126)
- Files per article: `N.ReadingView.html` + `N.ArchivalView.html`
- Reading View: Reflowed, comfortable reading experience
- Archival View: Page images with layout fidelity

### New Format (Issues 127–169+)
- Files per article: `readingViewN.html` + `manuscriptN.html` + `imageGalleryN.html`
- `manuscriptN.html` ("Original Layout" / Archival): Fixed 1024×768 page-image spreads using inline `<img>` tags.
- `readingViewN.html` ("Read Online"): Hybrid format.
  - Early pages are mostly empty placeholders:
    ```html
    <page page-num="15.1">
      <div class="page img-all"></div>
    </page>
    ```
  - Later pages contain reflowed text.

**The core issue**: The original iPad app dynamically injected full-bleed magazine page images into the `.img-all` containers at runtime. The static HTML files + `Cinefex.css` do **not** contain the images or CSS rules needed to display them.

**Current symptoms in the web app**:
- Text content loads and displays in Reading Views.
- Early pages in Reading Views show a large dark placeholder block (we added `background-color: #111827` as a fallback).
- No magazine page images appear in Reading Views for most new-format issues.
- Original Layout works better when the exact referenced image files exist on disk.
- Some later issues are missing certain image files entirely (e.g. title pages).

---

## Work Completed

### 1. Eliminated Fatal Load Crashes (Solved)

**Root causes identified**:
- New-format `Cinefex.css` files contain `//` single-line comments → PostCSS in Vite dev server crashes with "Unknown word".
- Some `manuscript*.html` files contain malformed `<!br style="clear:both"/>` tags → Vite's `parse5` HTML parser crashes with "incorrectly-opened-comment".

**Solutions implemented**:
- Initially created a custom Vite `configureServer` middleware to serve `/issues/**` and `/covers/**` completely raw (bypassing PostCSS, HTML transforms, etc.).
- Later migrated to **Path A** (recommended approach):
  - Created symlinks in `public/`:
    - `public/issues` → `../issues`
    - `public/covers` → `../covers`
  - Vite serves everything under `public/` as raw static assets by design (no transforms).
- Removed the custom middleware after switching to the symlink approach.
- Result: No more fatal PostCSS or parse5 errors on issues 127+.

**Files touched**: `vite.config.ts`, `tsconfig.node.json` (temporary changes during middleware work).

### 2. Style Injection Updates

- Added dedicated handling for new-format Archival views: `injectNewArchivalViewStyles()`.
- Rewrote `injectNewReadingViewStyles()`:
  - No longer strips the original `Cinefex.css`.
  - No longer targets old-format class names (`.manuscript`, `.dropCap`, `.sideBar`, `.caption`, etc.).
  - Provides only minimal, safe overrides for typography, centering, and `.img-all` containers.
- Old-format injection logic (issues 1–126) left completely untouched.
- Added a small supporting CSS rule for `.img-all` containers.

**File touched**: `src/services/styleInjection.ts`

### 3. Font Filename Normalization Utility

Created `scripts/normalize-issue-fonts.js`.

Many later issues ship font files with different names than what their own `Cinefex.css` `@font-face` rules reference:
- Real file: `Benguiat-Book.otf`
- CSS expects: `BenguiatStd-Book.otf`

The script creates the expected alias filenames as copies inside each issue's `fonts/` folder (non-destructive).

This resolved persistent font loading / OTS parsing errors in later issues (e.g. 167+).

**File created**: `scripts/normalize-issue-fonts.js` (run via `node scripts/normalize-issue-fonts.js`).

### 4. Image Population Logic (Attempts — Not Yet Successful)

Two iterations of client-side image injection were added to `populateNewReadingViewImages()` in `src/services/styleInjection.ts`:

**First attempt**:
- Used hard-coded generic filename patterns (`Cinefex-N-pX.Y.png`, etc.).
- Result: Almost no matches. Dark blocks remained.

**Second (current) attempt**:
- Scans the loaded document for real `<img src="images/...">` tags that already exist.
- Extracts the actual naming patterns and suffixes used in *that specific issue* (e.g. `-ADAS`, `-GEMINI`, `-HOBB`).
- Generates candidate filenames for empty `.img-all` containers using the discovered suffixes + a few generic fallbacks.
- Attempts to load them and sets the first successful one as `background-image`.

**Current result**:
- Still only the dark fallback background appears in Reading Views.
- No real magazine page images are being injected for the empty containers.

**File touched**: `src/services/styleInjection.ts`

---

## Why This Remains Difficult

- Image naming is inconsistent across new-format issues and even within a single issue (different articles use different suffixes).
- The original design assumed a runtime environment capable of dynamically supplying images.
- We are constrained to working with the static files as-is (user prefers not to modify source files inside `issues/` unless the alternative is large amounts of fragile code).
- Some images referenced in the HTML are genuinely missing from certain later issue packages on disk.

---

## Constraints

- Prefer not to modify files inside the `issues/` or `covers/` directories unless the alternative is significantly worse.
- Quick stabilization first, followed by polish.
- Video playback and image-map interactions (`ns://Video/...`) can be ignored for now.
- Re-running `python create_json.py` and copying the output to `public/` is acceptable when needed.
- The site is always-online behind HTTP Basic Auth; full offline support is out of scope.

---

## Status Update — 2026-05-30 (Path A Implementation Complete)

**Original Layout (Archival View) for issues 127+ is now functional.**

### What Was Done
- **Rollback of commit 637156b changes to `issues/127/readingView1.html`** (deliberate per plan). The hybrid pre-refactor version (~1,185 lines, empty `.img-all` title pages + raw text) was restored. The reflowed rewrite from that commit is discarded for this file. The file remains untracked in the working tree (as `issues/` is gitignored).
- **Data model enhancement**: Added `imageGalleryUrl` (optional) to the `Article` type and emitted by `create_json.py` via manifest lookup (with case-insensitive fallback to fix two known name mismatches: issue 145 "The Finest hours", issue 146 "The 5th wave").
- **Path A (client-side concatenation)** implemented for 127+ Original Layout:
  - When "Original Layout" is selected for issue > 126, the viewer loads the manuscript (text article) as before.
  - After initial styling, if `imageGalleryUrl` is present, `appendImageGalleryToArchival()` fetches the gallery HTML, sanitizes any remaining `<!br` / `<!img` comments, clones the `<page>` elements, and appends them to the manuscript document body.
  - `enhanceCombinedArchivalStyles()` then injects targeted rules for `.imageGalleryPage` (1024×768 spreads, shadows, background sizing) and hides all iPad-era gallery chrome (`.new_button-left`, `.thumbs`, video icons, etc.).
- **Sanitization hardened**: `sanitizeMalformedComments()` now handles both `<!br style="..."/>` and `<!img .../>` comments that appear in some 127+ manuscripts and galleries.
- **Debug instrumentation** added (plan default A): activate with `?debug=archival` in the URL or `localStorage.cinefexDebugArchival = '1'`. Key events (gallery URL, page counts, fetch errors) are logged only when enabled.
- **Graceful degradation** (plan default C): Articles without a gallery (currently 6 known) silently fall back to manuscript-only content.
- **"Do both"** executed: functional concatenation landed first, followed immediately by styling polish in the same pass. No visibly broken intermediate state was left.

### Results
- 185 of 191 articles in issues 127–169 now carry `imageGalleryUrl`.
- "Original Layout" for 127+ now renders the full magazine experience: text article pages (pre-rendered PNG plates) followed by the subsequent full-bleed photo spreads (PNG page plates + embedded JPG photos with authored positioning).
- Example: Issue 152 "Kong: Skull Island" — pages 54–55.31 (text) + p56.1 onward (photo spreads) appear as a continuous scroll.
- Old-format (≤126) archival views are completely untouched.
- Reading View behavior for the restored hybrid `readingView1.html` (issue 127 article 1) remains working.

### Remaining / Known
- 6 articles still lack a gallery file in the source tree (143/4, 158/3, 158/5, 169/7, 169/8). These will show manuscript content only.
- Video links (`ns://Video/...`) and image-map interactions remain out of scope.
- Path B (mechanical combiner script + static combined files) is deferred. It can be revisited later if runtime fetch overhead for the extra gallery request becomes a concern.

## Current Recommended Next Steps

**All original items from the handoff are complete or superseded.**

- The client-side image population path for Reading View empty `.img-all` containers (the previous focus) remains as-is; the primary user-reported blocker ("Original Layout" for 127+) is resolved.
- If Path B is ever pursued, a one-time `scripts/combine_archival_views.py` (or similar) can be written that produces `fullArchivalN.html` files and updates `archiveUrl` (or adds a new field). This would eliminate the extra fetch.
- The debug flag mechanism (`?debug=archival` / localStorage) can be used for any future diagnostics on 127+ views.

---

## Key Files (Updated)

- `vite.config.ts` — Unchanged (Path A raw serving via symlinks remains).
- `src/services/styleInjection.ts` — Now contains:
  - `sanitizeMalformedComments` (extended for `<!img`)
  - `appendImageGalleryToArchival` (Path A core)
  - `enhanceCombinedArchivalStyles` (gallery-specific polish)
  - Debug helpers (`isArchivalDebugEnabled`, `debugLog`)
- `src/components/viewer/ArticleViewer.tsx` — Calls `appendImageGalleryToArchival` in `handleIframeLoad` for 127+ archival views.
- `src/types/index.ts` — `Article` now has optional `imageGalleryUrl`.
- `create_json.py` — Emits `imageGalleryUrl` (with case-insensitive fallback) and fixed two manifest name mismatches.
- `public/issues_full.json` — Regenerated with the new field.
- `issues/127/readingView1.html` — Deliberately rolled back to the original hybrid version (untracked due to gitignore).

---

## Handoff Notes (Updated)

- Fatal error phase: complete (prior work).
- Reading View image injection for empty containers: still present but secondary.
- **Original Layout for 127+**: now solved via Path A client-side concatenation + styling. "Original Layout" = full combined magazine experience for issues 127+.
- The user preference to avoid modifying files inside `issues/` was respected (Path A chosen).
- Debug instrumentation is available but off by default.
- Path B remains an option for the future if fetch overhead or complexity justifies it.

---

**End of updated document.** The 127+ Original Layout problem is resolved. Ready for ongoing maintenance or Path B evaluation.

---

## Key Files

- `vite.config.ts` — Minimal after Path A migration.
- `src/services/styleInjection.ts` — Contains all injection logic + current (unsuccessful) image population code.
- `scripts/normalize-issue-fonts.js` — Useful utility for font alias creation.
- `public/issues` and `public/covers` — Symlinks created as part of Path A.

---

## Handoff Notes

- The fatal error phase is complete.
- We are now in the "data completeness + adaptive client-side image injection" phase.
- The user wants to preserve the original authored experience of the new-format files as much as possible.
- Focus should remain on making the existing page images appear in Reading Views rather than redesigning the layout.

---

**End of document.** Ready for next agent.
