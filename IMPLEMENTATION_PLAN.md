# Cinefex-Online: Full Enhancement Implementation Plan

> **Status: All phases complete** — Implemented February 2026

## Phase 1 — Build System & Tooling Foundation ✅

1. ✅ Initialize npm project with `package.json`
2. ✅ Install Tailwind CSS v4 (dev dep) with PostCSS and Autoprefixer; create `postcss.config.js`
3. ✅ Install Vite as dev server/build tool; create `vite.config.js`
4. ✅ Replace CDN `<script src="https://cdn.tailwindcss.com">` with build-time Tailwind via `css/tailwind.css`
5. ✅ Add ESLint v10 flat config (`eslint.config.js`) with recommended rules
6. ✅ Add `.prettierrc` for consistent formatting
7. ✅ Add `node_modules/` and `dist/` to `.gitignore`
8. ✅ Add npm scripts: `dev`, `build`, `preview`, `lint`, `format`

## Phase 2 — Security Fixes ✅

9. ✅ Add `cinefex.htpasswd` to `.gitignore`; remove from Git tracking
10. ✅ Create `.htaccess` with security headers (CSP, X-Frame-Options, HSTS, cache control, compression)
11. ✅ Remove inline `onclick` in viewer.js error button; use `addEventListener`

## Phase 3 — Bug Fixes ✅

12. ✅ Fix `md:w-2/2` → `md:w-1/2` in modal.js
13. ✅ Change `issues.json` → `issues_full.json` in archive.js to show all 169 issues
14. ✅ Remove dead `coverUrl`/`description` generation from create_json.py
15. ✅ Fix silent error swallowing in create_json.py (log to stderr)

## Phase 4 — Accessibility ✅

16. ✅ Make cover grid keyboard-accessible (`tabindex`, `role="button"`, keydown handler for Enter/Space)
17. ✅ Add `aria-label` to year-bucket nav links
18. ✅ Add `role="status"` to loading indicator
19. ✅ Add `<noscript>` fallback in index.html
20. ✅ Improve color contrast: `text-gray-400` → `text-gray-300` where needed

## Phase 5 — Code Quality & Architecture ✅

21. ✅ Move top-level DOM queries into init functions (`initModal`, `initViewer`)
22. ✅ Centralize font declarations into `css/fonts.css` (12 @font-face rules)
23. ✅ Extract config into `js/config.js` (FORMAT_THRESHOLD, DATA_URL, paths)
24. ✅ Replace `grid.innerHTML = ''` with `replaceChildren()`
25. ✅ Add JSDoc `@typedef` for Magazine/Article shapes (`js/types.js`)
26. ✅ Add type hints to Python scripts; fix bare `except`
27. ✅ Centralize iframe font injection via `FONT_FACE_CSS` constant in viewer.js

## Phase 6 — Performance ✅

28. ✅ Add service worker (`sw.js`) for cache-first offline support
29. ✅ Vite handles JS/CSS bundling and minification (11 modules → single bundle)

## Phase 7 — Features ✅

30. ✅ **Search** (`js/search.js`): filter by issue number, year, film name, article title with 300ms debounce
31. ✅ **URL routing** (`js/router.js`): hash-based deep linking (`#issue/42`, `#issue/42/article/1/read`)
32. ✅ **Favicon**: add `<link rel="icon">`
33. ✅ **Open Graph meta tags** for social sharing
34. ✅ **Scroll-to-top button** with smooth scroll
35. ✅ **Print stylesheet** hiding interactive elements

## Phase 8 — Cleanup & Documentation ✅

36. ✅ Delete `indexold.html`
37. ✅ Delete `covers/Cinefex.old.css`
38. ✅ Remove unused font files (Benguiat-Book.otf, Benguiat-BookItalic.otf, Benguiat.t1, DucDeBerryLT.otf)
39. ✅ Update `README.md` with build instructions, architecture docs, deployment guide
