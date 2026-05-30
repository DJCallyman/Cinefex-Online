# Cinefex Archives — Implementation & Migration History

> **Current Status**: React 19 + Vite 6 migration complete + post-migration corrections applied (May 2026).

This document preserves the historical record of the original vanilla-JS enhancement phases (Feb 2026) and documents the later React migration and cleanup work.

---

## Historical: Vanilla JS Enhancement Phases (February 2026)

### Phase 1 — Build System & Tooling Foundation ✅

1. ✅ Initialize npm project with `package.json`
2. ✅ Install Tailwind CSS v4 (dev dep) with PostCSS and Autoprefixer; create `postcss.config.js`
3. ✅ Install Vite as dev server/build tool; create `vite.config.js`
4. ✅ Replace CDN `<script src="https://cdn.tailwindcss.com">` with build-time Tailwind via `css/tailwind.css`
5. ✅ Add ESLint v10 flat config (`eslint.config.js`) with recommended rules
6. ✅ Add `.prettierrc` for consistent formatting
7. ✅ Add `node_modules/` and `dist/` to `.gitignore`
8. ✅ Add npm scripts: `dev`, `build`, `preview`, `lint`, `format`

### Phase 2 — Security Fixes ✅

9. ✅ Add `cinefex.htpasswd` to `.gitignore`; remove from Git tracking
10. ✅ Create `.htaccess` with security headers (CSP, X-Frame-Options, HSTS, cache control, compression)
11. ✅ Remove inline `onclick` in viewer.js error button; use `addEventListener`

### Phase 3 — Bug Fixes ✅

12. ✅ Fix `md:w-2/2` → `md:w-1/2` in modal.js
13. ✅ Change `issues.json` → `issues_full.json` in archive.js to show all 169 issues
14. ✅ Remove dead `coverUrl`/`description` generation from create_json.py
15. ✅ Fix silent error swallowing in create_json.py (log to stderr)

### Phase 4 — Accessibility ✅

16. ✅ Make cover grid keyboard-accessible (`tabindex`, `role="button"`, keydown handler for Enter/Space)
17. ✅ Add `aria-label` to year-bucket nav links
18. ✅ Add `role="status"` to loading indicator
19. ✅ Add `<noscript>` fallback in index.html
20. ✅ Improve color contrast: `text-gray-400` → `text-gray-300` where needed

### Phase 5 — Code Quality & Architecture ✅

21. ✅ Move top-level DOM queries into init functions (`initModal`, `initViewer`)
22. ✅ Centralize font declarations into `css/fonts.css` (12 @font-face rules)
23. ✅ Extract config into `js/config.js` (FORMAT_THRESHOLD, DATA_URL, paths)
24. ✅ Replace `grid.innerHTML = ''` with `replaceChildren()`
25. ✅ Add JSDoc `@typedef` for Magazine/Article shapes (`js/types.js`)
26. ✅ Add type hints to Python scripts; fix bare `except`
27. ✅ Centralize iframe font injection via `FONT_FACE_CSS` constant in viewer.js

### Phase 6 — Performance ✅

28. ✅ Add service worker (`sw.js`) for cache-first offline support *(later removed during React migration)*
29. ✅ Vite handles JS/CSS bundling and minification (11 modules → single bundle)

### Phase 7 — Features ✅

30. ✅ **Search** (`js/search.js`): filter by issue number, year, film name, article title with 300ms debounce
31. ✅ **URL routing** (`js/router.js`): hash-based deep linking
32. ✅ **Favicon**, Open Graph meta tags, scroll-to-top, print stylesheet

### Phase 8 — Cleanup & Documentation ✅

33–39. ✅ Delete legacy files, update README for the vanilla JS era

---

## React Migration & Post-Migration Corrections (2026)

After the vanilla JS foundation was solid, the project was fully migrated to a modern React 19 + TypeScript + Vite architecture.

### Migration Scope
- Complete rewrite from vanilla ES modules (`js/*.js`, `css/*.css`) into React components under `src/`
- Adoption of React Router (HashRouter) for article deep links
- Centralized state via `ArchiveContext`
- TypeScript strict mode across the entire app
- Tailwind v4 via PostCSS (no CDN)
- Reusable hooks (`useFocusTrap`)
- Service for dynamic iframe style injection (`styleInjection.ts`)

### Post-Migration Corrections (Priority Items — May 2026)

These corrections were applied in a single implementation pass with **no commits** during the work:

1. **Removed all broken PWA / offline code**
   - Deleted manual `navigator.serviceWorker.register('/sw.js')` (the file never existed after the React migration)
   - Removed `vite-plugin-pwa` plugin, dependency, and all configuration
   - Confirmed zero remaining references to PWA, service workers, or offline support in source or docs
   - Rationale: The site is always-online behind auth; full article content cannot be offline anyway

2. **Eliminated duplicate data file**
   - Deleted root `issues_full.json` (identical copy already lived in `public/`)
   - Only the `public/` copy is now used at runtime and during builds

3. **Removed legacy Vite config**
   - Deleted `vite.config.js` (stale vanilla-era file)
   - Single source of truth is now `vite.config.ts`

4. **Enabled strict React ESLint rules**
   - Wired `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh` into the flat config with recommended rule sets
   - Fixed all surfaced violations (exhaustive-deps, no-unescaped-entities, react-refresh export rules)
   - Added explicit allowlist for `useArchiveContext` hook export

5. **Fixed fragile reference-equality article lookup**
   - Changed `ArticleList` → `IssueModal` → `ViewOptions` flow to pass the article index explicitly instead of relying on `findIndex((a) => a === article)`
   - This eliminates a latent bug under any future memoization or data transformation

6. **Eliminated hardcoded debounce value**
   - `SearchBar` now imports and uses `CONFIG.DEBOUNCE_MS` instead of a magic `300`

7. **Added root Error Boundary**
   - New `ErrorBoundary.tsx` component catches any render error in the tree
   - Shows a friendly fallback UI with “Return to Archive” reset action
   - Logs the error to console for debugging
   - Wrapped at the `AppContent` level

8. **Improved Article Viewer focus management (accessibility)**
   - On open: focus is moved to the close button
   - On close: focus is restored to the element that opened the viewer (or sensible fallback for direct URL access)
   - Proper cleanup and handling of direct deep-link case

9. **Full documentation overhaul**
   - Complete rewrite of `README.md` to accurately describe the current React + Vite architecture, component structure, data pipeline, deployment, accessibility features, and explicit statement that there is no offline support
   - Updated `IMPLEMENTATION_PLAN.md` (this file) to preserve historical vanilla-JS phases while clearly marking the React migration and corrections as complete

### Verification Performed After Corrections
- `npm run lint` — clean with full strict React + Hooks + Refresh rules
- `npm run typecheck` — clean (strict TypeScript)
- `npm run build` — successful production build with no PWA artifacts
- Manual keyboard + focus testing on modals and article viewer
- Confirmed no remaining PWA/service-worker references outside `node_modules` and the historical `issues/` manifests

---

## Current Architecture Summary (Post-Corrections)

- **Framework**: React 19 + TypeScript (strict) + React Router 7 (HashRouter)
- **Build**: Vite 6 (no legacy JS config)
- **Styling**: Tailwind CSS v4 (PostCSS)
- **Linting**: ESLint flat config with full React recommended rules + Hooks + Refresh
- **State**: `ArchiveContext` (data loading, search, year buckets, selected issue)
- **Accessibility**: Skip link, focus trap hook, programmatic focus management in viewer, proper ARIA
- **Resilience**: Root `ErrorBoundary`
- **Offline**: None (intentionally removed — always-online hosted site)
- **Auth**: HTTP Basic via `.htaccess` (server-side only)

---

## Notes for Future Maintainers

- The `issues/` and `covers/` directories are intentionally gitignored and must be deployed alongside `dist/`.
- `create_json.py` writes `issues_full.json` to the current working directory; it must then be placed in `public/` for the build.
- All article deep links use hash routing (`/article/0/read?issue=42`).
- The ESLint config is intentionally strict — do not weaken it without strong justification.
- There is no service worker or PWA manifest by design.

---

*Document last updated: May 2026 (post-correction implementation pass)*

---

## 2026-05-30 — Issues 127+ Original Layout (Path A) + Rollback

**Scope executed** (per user-approved plan with defaults A–D):
- **Rollback**: `git checkout 637156b^ -- issues/127/readingView1.html` restored the original hybrid version (1,185 lines, empty `.img-all` + raw text). The reflowed rewrite from that commit was discarded. The file is left untracked (issues/ is gitignored per decision D).
- **Data layer**: Added optional `imageGalleryUrl` to `Article` (src/types/index.ts). Updated `create_json.py` to emit it from the manifest's `<imageGalleries>` section (with case-insensitive name fallback). This also resolved the two latent manifest lookup failures (issue 145 "The Finest hours", issue 146 "The 5th wave"). Regenerated `issues_full.json` and copied to `public/`.
- **Path A implementation** ("Original Layout" for 127+ now = combined manuscript + image spreads):
  - New `appendImageGalleryToArchival()` in `styleInjection.ts`: after the manuscript loads for archival view + issue > 126, fetches the gallery (if `imageGalleryUrl` present), sanitizes malformed `<!br`/`<!img` comments, clones `<page>` elements, appends them to the iframe document body.
  - `enhanceCombinedArchivalStyles()` adds gallery-specific rules (`.imageGalleryPage` as 1024×768 spreads, authored photo positioning respected) and hides all iPad chrome (buttons, thumbs, video icons).
  - `sanitizeMalformedComments()` generalized to handle both comment forms.
  - Called from `ArticleViewer.handleIframeLoad` (setTimeout 0 after `injectStyles`).
- **Styling polish** ("do both"): functional concat + visual polish delivered in the same pass. No broken intermediate state.
- **Debug instrumentation** (plan default A): `?debug=archival` or `localStorage.cinefexDebugArchival='1'` gates all `[CinefexArchival]` logs (page counts, gallery URL, errors).
- **Graceful degradation** (plan default C): missing galleries (6 known) silently fall back to manuscript-only.
- **No extra loading UI** during gallery fetch (plan default B).

**Verification**:
- `npm run typecheck` clean
- `npm run lint` clean (strict React + Hooks + Refresh)
- Manual spot checks: issue 152 Kong (text pages 54–55 + photo spreads p56+), old-format regression, missing-gallery degradation, debug flag output.

**Documentation**:
- `ISSUES_127_PLUS_IMAGE_PROBLEM.md` fully updated with status, what was done, results, and new "Current Recommended Next Steps".
- This entry added to IMPLEMENTATION_PLAN.md.

**Decisions locked**:
- Path A chosen (client-side). Path B (mechanical combiner) deferred.
- Combined experience is what "Original Layout" now shows for 127+.
- Debug allowed; off by default.
- Rollback file not committed.

**Files changed (implementation)**:
- src/types/index.ts
- create_json.py (and regenerated public/issues_full.json)
- src/services/styleInjection.ts (core new functions + debug + sanitizer)
- src/components/viewer/ArticleViewer.tsx (trigger for 127+ archival)
- ISSUES_127_PLUS_IMAGE_PROBLEM.md (major update)
- Pre-Implementation-Baseline.md (new, local record)
- IMPLEMENTATION_PLAN.md (this entry)

All user constraints respected (no modifications inside issues/ for the runtime solution; quick stabilization + polish in one pass). Ready for production use or future Path B evaluation.
