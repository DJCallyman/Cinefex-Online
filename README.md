# Cinefex Archives

A modern web application for browsing the complete archive of *Cinefex* magazine — the journal of cinematic illusions. The site provides an interactive interface to explore 169+ issues (1980–present), with every article available in both a comfortable reading-optimized view and the original magazine layout.

---

## Table of contents

- [Project overview](#project-overview)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [NPM scripts](#npm-scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
  - [Top-level composition](#top-level-composition)
  - [Routing](#routing)
  - [State and data flow](#state-and-data-flow)
  - [Two article-view formats (legacy vs new-format)](#two-article-view-formats-legacy-vs-new-format)
  - [Article viewer & iframe style injection](#article-viewer--iframe-style-injection)
  - [Search (title + full-text)](#search-title--full-text)
  - [Bookmarks](#bookmarks)
  - [Theming](#theming)
  - [Accessibility & keyboard navigation](#accessibility--keyboard-navigation)
  - [Error handling](#error-handling)
  - [Performance: preloads & caching](#performance-preloads--caching)
- [Data pipeline](#data-pipeline)
- [Build-time tooling](#build-time-tooling)
- [Container image & runtime](#container-image--runtime)
- [Deployment](#deployment)
  - [Local (docker compose)](#local-docker-compose)
  - [unraid](#unraid)
  - [Reverse proxy & HTTPS](#reverse-proxy--https)
  - [Plain Apache (`/var/www` + `.htaccess`)](#plain-apache-varwww--htaccess)
  - [Updating the image](#updating-the-image)
  - [Environment variables](#environment-variables)
- [Testing](#testing)
- [Browser support](#browser-support)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [Future enhancements](#future-enhancements)
- [License](#license)

---

## Project overview

Cinefex Archives is a **React 19 + Vite 6** single-page web app that makes the full digitized Cinefex magazine collection accessible through a clean, keyboard-friendly, deeply linkable interface. The site is read-only and exists purely as an archival browser.

The React front-end is fully static. All of the magazine content — hundreds of HTML files, cover images, and font files — is served as ordinary files by nginx (inside the published container) or Apache (in the manual `dist/` deployment). The JS bundle's only jobs are to render the cover grid, the issue modal, the article viewer, the search bar, and the bookmarks view.

The app is published to GHCR on every merge to `main` and is designed to run on a small home-server stack (unraid + Nginx Proxy Manager in the canonical setup) or in `docker compose` for local development.

> **Important**: This is an **always-online** application. There is no offline / PWA support. The full article content lives in a large `issues/` directory on the server and is not cached for offline use.

---

## Key features

- **Dual view modes** for every article:
  - **Reading View** — reflowed, comfortable online reading experience
  - **Original Layout** — faithful archival view of the printed magazine pages
- **Issue browser** — grid of all issues organized into 5-year buckets, with first-bucket images preloaded for LCP
- **Powerful search** with two strictly-separated modes:
  - **Title / film** (default) — fast metadata-only substring filter
  - **Full text** — body-text MiniSearch index, lazy-loaded only on opt-in
- **Deep linking** — shareable URLs for issues, individual articles in either view, and the bookmarks view
- **Bookmarks** — local `localStorage` saves, cross-tab synced, with a dedicated `/bookmarks` view and star toggles on every cover/article
- **Theming** — three-state light / dark / auto theme toggle, persisted in `localStorage`, drives a CSS-variable palette
- **Fully keyboard accessible** — skip links, focus traps, ARIA, Escape handling, focus restoration, `gg` and `/` global shortcuts
- **Responsive design** — works well on desktop and tablet
- **Error resilience** — root `ErrorBoundary` prevents total app crashes
- **Password protected** — HTTP Basic Authentication via a deployed `.htaccess` (shipped as `.htaccess.example`) + `.htpasswd`
- **Image optimisation** — `cwebp`-generated `.webp` siblings next to every cover JPEG, with `<picture>` fallback
- **Font-metric centring** — the `BenguiatStd*` `@font-face` blocks in
  `src/styles/fonts.css` set `ascent-override` / `descent-override` /
  `line-gap-override` (82.9% / 17.1% / 0%) so the cap-height ink is
  centred in the line-box. The Win metrics shipped with the OTF
  (`usWinAscent=882, usWinDescent=250` out of `unitsPerEm=1000`) would
  otherwise push single-line control text (buttons, search input) up by
  several pixels.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| UI framework | **React 19** with concurrent features (`Suspense`, `lazy`) |
| Routing | **react-router-dom 7** in `HashRouter` mode (no server-side SPA fallback) |
| Language | **TypeScript 5.7** in strict mode (with `noUnusedLocals` / `noUnusedParameters`) |
| Build / dev | **Vite 6** (`@vitejs/plugin-react`), **PostCSS** with **Tailwind CSS v4** (`@tailwindcss/postcss`) |
| Testing | **Vitest 4** + **jsdom** + **@testing-library/react** + **@testing-library/dom** |
| Lint / format | **ESLint 9** (flat config, React + React Hooks + React Refresh), **Prettier 3** |
| Search index | **MiniSearch 7** (client-side full-text search) |
| Runtime image | **nginx 1.27 (alpine)** — static-asset serve only |
| CI | **GitHub Actions** (`docker/build-push-action` → GHCR) |

Python 3 is **not** a runtime or build dependency. The metadata in
`public/issues.json` and `public/issues_full.json` is committed to git and
hand-curated. The full-text `public/search_index.json` is gitignored and is
rebuilt on demand via `npm run search:index` (which calls `python3
create_json.py`); it is **not** regenerated automatically on `npm run build`
or at container start. See [Data pipeline](#data-pipeline).

---

## Getting started

### Prerequisites

- Node.js 20+ and npm
- Python 3.8+ (only required if you ever want to re-run `npm run search:index` to rebuild the full-text search index from `issues/` — not needed for day-to-day development, not needed for the build, and not needed at runtime)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite dev server with hot module replacement on `http://localhost:5173`.

### Production build

```bash
npm run build
```

This runs, in order:

1. `npm run covers:webp` — converts any out-of-date `covers/N/cover512.jpg` files to WebP siblings via the system `cwebp` binary.
2. `tsc -b` — type-check the project (uses `tsconfig.app.json` + `tsconfig.node.json`).
3. `vite build` — emit the production bundle into `dist/`.

`public/issues.json`, `public/issues_full.json`, and `public/search_index.json`
are **not** regenerated by the build. The first two are committed to git
(hand-curated); the search index is rebuilt on demand via
`npm run search:index`. Vite's `publicDir` copy just moves whatever is in
`public/` into `dist/` verbatim.

### Other scripts

See [NPM scripts](#npm-scripts) below for the complete list.

---

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server with HMR. |
| `npm start` | `vite preview --host 0.0.0.0` — preview the production build on every interface (used inside the container). |
| `npm run build` | Full production build: WebP covers → `tsc -b` → `vite build`. **Does not regenerate JSON.** |
| `npm run covers:webp` | Convert any out-of-date cover JPEGs to WebP (idempotent, skips up-to-date files). |
| `npm run covers:webp:check` | Same as above in `--check` mode; exits non-zero if any cover needs conversion. |
| `npm run search:index` | **Manual** rebuild of the gitignored `public/search_index.json` (and `.gz`) via `python3 create_json.py`. Run on demand only — the script also re-writes `public/issues.json` and `public/issues_full.json` from the on-disk `issues/` tree, so use it when you want to start a new round of hand-corrections from scratch rather than edit the committed JSONs directly. |
| `npm run preview` | `vite preview` — serve the existing `dist/` locally. |
| `npm run lint` | ESLint with the flat React + React Hooks + React Refresh config. |
| `npm run typecheck` | `tsc --noEmit` (project-references aware). |
| `npm run format` | Prettier — writes to disk for `src/**/*.{ts,tsx,css}` and `*.html`. |
| `npm test` | Vitest single run (jsdom env). |
| `npm run test:watch` | Vitest watch mode. |

---

## Project structure

```
Cinefex-Online/
├── public/
│   ├── favicon.ico (symlink to /covers/1/cover512.jpg — see index.html)
│   ├── fonts/                 # Custom typefaces served statically
│   ├── covers → ../covers     # symlink (dev only; stripped in the Docker build, see Dockerfile)
│   ├── issues → ../issues     # symlink (dev only; same)
│   ├── issues_full.json       # Archive metadata — committed, hand-curated
│   ├── issues.json            # Issues 1–126 only — committed, hand-curated
│   ├── search_index.json      # Full-text search index — generated, gitignored
│   └── search_index.json.gz   # Gzipped sibling of the above, served via gzip_static
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx              # Root error boundary (class component)
│   │   ├── archive/                       # Cover grid + 5-year year buckets
│   │   │   ├── ArchiveGrid.tsx            # Loads from ArchiveContext; bucket sections or filtered list
│   │   │   ├── Cover.tsx                  # <picture> WebP+JPEG cover with intrinsic size
│   │   │   └── MagazineCover.tsx          # One cover card: cover, bookmark, title, year, hit snippet
│   │   ├── layout/                        # Top-level chrome
│   │   │   ├── Header.tsx                 # Title, version, BucketNav, SearchBar, /bookmarks link
│   │   │   ├── BucketNav.tsx              # 5-year bucket jump links (smooth-scroll to section)
│   │   │   ├── SkipLink.tsx               # <a href="#magazine-grid" className="skip-link">
│   │   │   ├── ScrollToTop.tsx            # Floating "back to top" button
│   │   │   └── ThemeToggle.tsx            # Fixed light/dark/auto toggle
│   │   ├── modal/                         # Issue detail modal
│   │   │   ├── IssueModal.tsx             # Two-pane modal: cover + article list or view options
│   │   │   ├── ArticleList.tsx            # List of articles in the open issue
│   │   │   └── ViewOptions.tsx            # "Read Online" / "View Original Layout" chooser
│   │   ├── viewer/                        # Full-screen article iframe viewer
│   │   │   └── ArticleViewer.tsx          # Lazy-loaded; owns iframe + prev/next + close
│   │   ├── search/                        # Search bar
│   │   │   └── SearchBar.tsx              # Title/Full-text pill toggle, debounced input
│   │   └── bookmarks/                     # Saved-articles feature
│   │       ├── BookmarkButton.tsx         # Star toggle (used on covers + article list)
│   │       └── BookmarksView.tsx          # /bookmarks route
│   ├── context/
│   │   ├── ArchiveContext.tsx             # Magazine data, search state, year buckets, selection
│   │   └── BookmarksContext.tsx           # localStorage-backed bookmarks, cross-tab sync
│   ├── services/
│   │   ├── styleInjection.ts              # Per-format CSS injection into article iframes
│   │   ├── collapseMultiVariant.ts        # Collapse near-duplicate gallery pages into one variant
│   │   └── iframeStyles/                  # CSS string exports: old/new reading+archival, combined
│   │       ├── oldReading.ts
│   │       ├── oldArchival.ts
│   │       ├── newReading.ts
│   │       ├── newArchival.ts
│   │       └── combinedArchival.ts
│   ├── hooks/
│   │   ├── useFocusTrap.ts                # Reusable focus trap (Tab / Shift+Tab cycler)
│   │   ├── useModalShell.ts               # Focus trap + Escape + body scroll lock
│   │   ├── useGlobalShortcuts.ts          # `/` focus search, `gg` focus bucket nav
│   │   ├── useFirstBucketPreloads.ts      # <link rel=preload> for the first N covers
│   │   └── useTheme.ts                    # light/dark/auto state + persistence
│   ├── utils/
│   │   ├── bookmarks.ts                   # localStorage read/write + add/remove helpers
│   │   ├── searchIndex.ts                 # Lazy MiniSearch loader + snippet extractor
│   │   ├── nav.ts                         # getArticleNeighbors, getIssueNeighbors
│   │   ├── highlight.ts                   # HTML-escape-safe <mark> wrapper for query terms
│   │   ├── articleDisplay.ts              # Defensive subtitle helper (mirrors create_json.py's
│   │   │                                 #   clean_article_title) — never renders a duplicated
│   │   │                                 #   subject on the article-list button
│   │   └── theme.ts                       # ThemeMode type, storage helpers, resolveTheme()
│   ├── config/
│   │   └── index.ts                       # FORMAT_THRESHOLD, DATA_URL, DEBOUNCE_MS, cover sizes
│   ├── types/
│   │   └── index.ts                       # Article, Magazine, ViewMode, YearBucket
│   ├── styles/
│   │   ├── fonts.css                      # @font-face declarations (host page)
│   │   ├── fonts.ts                       # Vite `?raw` import of fonts.css for iframe injection
│   │   └── styles.css                     # Theme variables, magazine-cover hover, modal transitions
│   ├── test/
│   │   └── setup.ts                       # Vitest setup (jsdom matchers, etc.)
│   ├── App.tsx                            # Top-level layout + Suspense + Routes
│   ├── main.tsx                           # createRoot + HashRouter + context providers
│   ├── index.css                          # @import 'tailwindcss'; @source ...;
│   └── vite-env.d.ts                      # Vite/Vitest ambient types
├── covers/                                # Magazine cover images, one folder per issue
│   └── N/cover512.jpg + cover512.webp     # 512x512 cover art (WebP is generated, not committed
│                                          # unless already in the repo)
├── issues/                                # Issue HTML trees (gitignored, deployed via bind mount)
│   └── N/
│       ├── manifest.xml                   # <article> + <readingView> + <imageGallery> entries
│       ├── N.ReadingView.html             # Pre-127 only
│       ├── N.ArchivalView.html            # Pre-127 only
│       ├── readingViewN.html              # 127+ only
│       ├── manuscriptN.html               # 127+ only (Original Layout base)
│       ├── imageGalleryN.html             # 127+ only (appended at runtime to manuscript)
│       └── fonts/                         # Per-issue typefaces (see normalize-issue-fonts.js)
├── fonts/                                 # Top-level custom typefaces served at /fonts
├── scripts/                               # Build-time Node helpers
│   ├── convert-covers-to-webp.js          # `cwebp` wrapper, idempotent
│   └── normalize-issue-fonts.js           # Aliases missing font filenames inside 127+ issues
├── docker/
│   ├── entrypoint.sh                      # Runtime setup: wait for bind mount, regen JSON, symlink issues/
│   └── nginx.conf                         # /etc/nginx/conf.d/default.conf (gzip, caching, no SPA fallback)
├── unraid/
│   └── cinefex-online.xml                 # unRAID Community Applications template
├── .github/workflows/
│   └── image.yml                          # Build & push to ghcr.io on merge to main
├── create_json.py                         # Python: parse manifests, write JSON, build search index
├── check_article_names.py                 # Validation: compare JSON names against HTML <Title>
├── vite.config.ts                         # React plugin, manualChunks (vendor), Vitest config
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js                       # Flat config (TS + React + React Hooks + React Refresh)
├── postcss.config.js                      # Tailwind v4 PostCSS plugin
├── .prettierrc                            # 4-space tabs, single quotes, 120 col
├── .htaccess.example                      # Apache template (security headers, Basic Auth, caching, compression)
├── cinefex.htpasswd                       # HTTP Basic Auth credentials (gitignored)
├── Dockerfile                             # Multi-stage: node:20-builder → nginx:1.27-alpine
├── docker-compose.yml                     # Local mirror of the unraid container
├── package.json / package-lock.json
└── dist/                                  # Vite build output (gitignored)
```

---

## Architecture

### Top-level composition

`src/main.tsx` mounts the React tree under `StrictMode` and a `HashRouter`. Two providers wrap the app:

```
StrictMode
  └── HashRouter
        └── ArchiveProvider        # archive data, search state, year buckets, selection
              └── BookmarksProvider   # localStorage-backed saved articles
                    └── App          # layout chrome + Suspense + Routes
```

`App` is small on purpose: skip link → header → `<main>` (with `Suspense` + `Routes`) → the `IssueModal` (driven by `selectedIssue` from `ArchiveContext`) → scroll-to-top → theme toggle → the `ErrorBoundary` that wraps the whole thing.

Routes (all hash-prefixed):

| Path | Component |
|------|-----------|
| `/` | `ArchiveGrid` (cover grid) |
| `/bookmarks` | `BookmarksView` |
| `/article/:articleIndex/:viewMode?issue=N` | `ArticleViewer` (lazy-loaded) |

The `?issue=N` query param is read with `useSearchParams`; `articleIndex` and `viewMode` (`read` / `archive`) are URL path segments. Because the router is `HashRouter`, deep links never reach the server, which is why the nginx config deliberately has **no SPA fallback** (a fallback would silently mask 404s for missing covers/issues — exactly the class of bug that prompted removing it).

The issue modal (`IssueModal` + `ArticleList`) renders one button per
article. Each button shows two lines: line 1 is the subject (film
name, from `name`), line 2 is the article's distinct subtitle (from
`articleTitle`, after the `displayTitle` defensive helper in
`src/utils/articleDisplay.ts` removes any duplicated-subject prefix).
The modal's accessible name is the `CINEFEX #N` label (the
`aria-labelledby="modal-title"` target); we deliberately do not render
the joined `magazine.title` ("A / B / C" of all subjects) above the
button list, because it would be a redundant restatement of the
subjects that the buttons already show.

### Routing

- Hash-based — URLs look like `https://cinefex.example/#/article/0/read?issue=3`.
- Deep links for issues, articles (in either view), and the bookmarks view are first-class.
- `ArticleViewer` is `React.lazy`-loaded so the article-rendering code is not in the initial bundle.
- Modal-open vs. detail-page routing is intentionally split: opening a cover sets `selectedIssue` (which renders `IssueModal` on top of the grid). Picking an article inside the modal closes the modal and navigates to `/article/...`, which mounts `ArticleViewer` and unmounts the modal. Closing the viewer navigates back to `/`.

### State and data flow

**`ArchiveContext`** owns the global archive state:

| State | Purpose |
|-------|---------|
| `magazines: Magazine[]` | The parsed `issues_full.json` payload. |
| `buckets: YearBucket[]` | 5-year groupings, computed once in `computeYearBuckets`. |
| `isLoading` / `error` | Initial fetch lifecycle. |
| `searchQuery` | The debounced search string (input itself is local to `SearchBar`). |
| `searchMode: 'title' \| 'fulltext'` | Which search mode the user picked. |
| `selectedIssue: number \| null` | Drives `IssueModal` rendering. |
| `fullTextHits: FullTextHit[]` | MiniSearch results for the current fulltext query. |
| `isSearchIndexLoading` / `isSearchIndexReady` | Lifecycle of the lazy index fetch. |

On mount, the provider fetches `/issues_full.json` (from `CONFIG.DATA_URL`), sorts issues numerically (already sorted by `create_json.py`), and computes the year buckets. The `selectedIssue` setter is the only piece of state that escapes the provider's "data" responsibility — it's intentionally colocated with the archive because opening a cover is an archive concern, not a UI concern.

**`BookmarksContext`** is a separate provider so the article viewer, modal, and bookmarks view can all read & write the same source of truth. It loads from `localStorage` (`cinefex.bookmarks.v1`) on mount, persists on every change, and syncs across tabs via the `storage` event.

The two contexts are deliberately independent: deleting or clearing the archive data does not affect bookmarks, and vice versa.

### Two article-view formats (legacy vs new-format)

The archive has two distinct source architectures, separated by `CONFIG.FORMAT_THRESHOLD` (currently issue 126). This is the single most important detail for understanding the codebase: every per-format quirk, CSS injection, and gallery-append step is keyed off `issueNumber <= FORMAT_THRESHOLD` vs `> FORMAT_THRESHOLD`.

**Issues 1–126 (legacy format)**

- Each article is represented by a paired `N.ReadingView.html` and `N.ArchivalView.html`.
- **Reading View** is mostly self-contained reflowed HTML; the injector supplies a `@font-face` block and a `OLD_READING_CSS` stylesheet, then injects an `<h1 class="injected-title">` from the article's Dublin Core / `Film` / `Creator` meta tags.
- **Original Layout** maps directly to the archival HTML file for that article. The injector repairs a rare malformed `<page><div class="page"><div style="width:864px;height:768px;"><div class="page">…</div></div></div></page>` structure (e.g. issue 3's "Empire Strikes Back" title page) via `fixMalformedArchivalPageStructure`, then applies `OLD_ARCHIVAL_CSS`.

**Issues 127+ (new-format / iPad-derived format)**

- **Reading View** is a hybrid document: text lives in `readingView*.html`, but some opening spreads and inline imagery are populated at runtime from sibling `manuscript*.html` and `imageGallery*.html` files. The injector:
  1. Adds the font face block + `NEW_READING_CSS`.
  2. Injects the title `<h1>` from the metadata.
  3. Calls `populateNewReadingViewImages`, which fetches the sibling `manuscript*.html` to fill empty `<div class="img-all">` title-page containers with the full-bleed page image, and fetches the sibling `imageGallery*.html` to inject inline figures into matching text pages.
- **Original Layout** is based on `manuscript*.html`, augmented by appending `imageGallery*.html` pages so the viewer can reconstruct the combined magazine experience. The injector:
  1. Sanitises malformed SGML comments (`<!br …>` and `<!img …>`) that some source files contain.
  2. Applies `NEW_ARCHIVAL_CSS`.
  3. `ArticleViewer` then calls `appendImageGalleryToArchival`, which fetches the gallery HTML, sanitises it, appends its `<page>` elements to the manuscript document body, runs `collapseMultiVariantGalleryPages` to coalesce N near-identical photo-spread variants into one page with a working thumbnail switcher, and re-applies archival styling + `COMBINED_ARCHIVAL_CSS`.

A debug gate, `?debug=archival` (or `localStorage.cinefexDebugArchival='1'`), enables `[CinefexArchival]` console logging in the new-format archival path.

### Article viewer & iframe style injection

`ArticleViewer` renders the article inside a single `<iframe>`, keyed by `${issueNumber}-${articleIndex}-${viewMode}` so changing the view mode unmounts and remounts the iframe (forcing a clean CSS re-injection). On `onLoad`, the parent:

1. Calls `injectStyles(iframe, issueNumber, isReadingView)`. This function dispatches on the issue number:
   - `new + reading` → `injectNewReadingViewStyles`
   - `new + archival` → `injectNewArchivalViewStyles`
   - `old + archival` → `injectOldArchivalViewStyles` (also runs `fixMalformedArchivalPageStructure`)
   - `old + reading` → `injectOldReadingViewStyles`
2. If `!isReadingView && issueNumber > 126`, schedules `appendImageGalleryToArchival` on the next tick (the new-format combined-view work described above).

The CSS strings themselves live in `src/services/iframeStyles/*.ts`, which Vite imports as raw text via the `?raw` query (`fonts.css` is also imported this way via `src/styles/fonts.ts`). The four flavours plus a `COMBINED_ARCHIVAL_CSS` overlay are exported from a barrel `iframeStyles/index.ts`.

`ArticleViewer` also handles prev/next article navigation using `getArticleNeighbors`, which builds a flat list of `(issue, articleIndex)` tuples in archive order and looks up the immediate neighbors (no wraparound). The navigation buttons render in a top-center floating toolbar; the close button is top-right and is the modal-shell's initial focus.

### Search (title + full-text)

The search bar is in the header and is always available, with a two-pill mode toggle (`Title / film` | `Full text`).

**Title / film mode** (default)

- Original metadata-only substring filter, unchanged from before the full-text feature was added.
- Matches against issue number, year, issue title, article `name`, and `articleTitle`.
- Fast, no network fetch, works in dev without a build step.
- On each result cover, `MagazineCover` highlights the matched text inside the issue number / year strings via `utils/highlight.ts` (which HTML-escapes the source so the surrounding `&` entities can't be corrupted).

**Full-text mode**

- Fetches `/search_index.json` lazily, only when the user switches to this mode. The wire payload in default title mode stays at zero.
- A `.gz` sibling is also written, and nginx's `gzip_static on;` directive serves it automatically.
- `utils/searchIndex.ts` builds a `MiniSearch` in-memory index from the payload. Field boosting: `articleTitle` (2×) > `name` (1.5×) > `text` (1×). Fuzzy matching with edit distance 0.2 enables typo tolerance. Both prefix and `combineWith: 'AND'` are on.
- The two modes are **never mixed** — switching modes clears the current results, and the user always knows exactly what they're searching.
- In fulltext mode the cover card shows the top matching article's name and a ~120-char snippet around the first match (extracted by `extractSnippet`).

The search bar is debounced with `CONFIG.DEBOUNCE_MS` (300 ms). Escape clears the input and blurs it. The input is `type="search"`; the native `::-webkit-search-cancel-button` is hidden in `styles.css` so the only clear control is the React-rendered `<button id="search-clear">` (avoids the "two X" duplicate-control bug that occurs when both are visible).

### Bookmarks

`localStorage` key: `cinefex.bookmarks.v1`. Each entry stores `{ issue, articleIndex, name, savedAt }` — the `name` is snapshotted at save time so the bookmarks list still renders when archive data is loading or the source article has been removed.

- **Save / unsave** — `BookmarkButton` is a star toggle used in two places: on every cover (saving a sentinel for the issue's first article) and in the article list inside `IssueModal` (saving the specific article). Pressing it from a cover jumps the user to that issue when they open the bookmark.
- **List view** — `/bookmarks` (`BookmarksView`) splits the saves into **matched** (joined back to a current magazine + article) and **unmatched** (article removed from the archive). Matched entries render as full cover cards that link straight to the saved article.
- **Cross-tab sync** — listens for `storage` events with a `cinefex.bookmarks*` key prefix and re-reads the local store.
- **Clear all** — `confirm()`-guarded, deletes every entry.

### Theming

`useTheme` is the single source of truth for the active theme. It tracks the user's picked mode (`light` / `dark` / `auto`) in `localStorage` under `cinefexThemeMode` and the OS-level `prefers-color-scheme` media query (only relevant when `mode === 'auto'`). The resolved palette is written to `<html data-theme="…">`, which `styles.css` uses to drive the CSS variable palette (`--bg`, `--text`, `--accent`, etc.). `ThemeToggle` is a single fixed button that cycles `light → dark → auto → light`.

Light mode re-skins the major surfaces (header, bucket nav, search input, modal panel, cover, viewer background) via targeted CSS overrides — most of the rest of the UI is plain Tailwind with `dark:`-style utility classes.

### Accessibility & keyboard navigation

- **Skip link** — `<a href="#magazine-grid" className="skip-link">` jumps past the header chrome.
- **`useFocusTrap`** — used by `useModalShell`. Tab/Shift+Tab cycles within the modal; the previously focused element is restored on close.
- **`useModalShell`** — wraps `useFocusTrap` and adds Escape-to-close and a `document.body.style.overflow = 'hidden'` lock while the modal is open.
- **`ArticleViewer`** — programmatically focuses the close button on open (via `useModalShell`'s `initialFocusRef`) and restores focus to the prior element on close. Direct deep links (no prior focus) fall back to the first focusable in the modal container.
- **Global shortcuts** (`useGlobalShortcuts`):
  - `/` — focus the search input (suppressed when an editable element is focused).
  - `g g` — within 800 ms, focus the first bucket-nav button so the second letter can pick a year range.
- **`useFirstBucketPreloads`** — injects `<link rel="preload" as="image" fetchpriority="high">` for the first 8 covers, in parallel with React hydration.
- All cover cards and article buttons have explicit `role`, `aria-label`, and keyboard handlers (Enter / Space).
- The cover grid's arrow-key navigation lives in `ArchiveGrid` (roving tabindex); the rest of the keyboard multiplexing is in `useGlobalShortcuts`.

### Error handling

A root `ErrorBoundary` (`src/components/ErrorBoundary.tsx`, class component) wraps the entire application. If any component throws, users see a friendly fallback with a "Return to Archive" button. The reset handler also calls `setSelectedIssue(null)` to clear any stale modal state. In dev mode (`import.meta.env.DEV`), the error stack is shown inside a `<details>` block.

The article viewer additionally distinguishes "missing article" (the route's `(issue, articleIndex)` doesn't resolve) from "iframe load error" (the resource itself failed), with a different fallback for each.

### Performance: preloads & caching

- **`useFirstBucketPreloads`** — preload tags for the first 8 covers, with both `image/webp` and `image/jpeg` sources (the browser will dedupe to whichever it actually fetches).
- **`LCP_COVER_COUNT = 4`** in `ArchiveGrid` — the first 4 covers in the first bucket get `loading="eager"` and `fetchPriority="high"`.
- **WebP cover pipeline** — `npm run covers:webp` runs `cwebp -q 82` over every `covers/N/cover512.jpg` to produce a `cover512.webp` sibling. `Cover.tsx` emits a `<picture><source type="image/webp"><img></picture>` so the ~30% smaller WebP is preferred when supported, with silent JPEG fallback.
- **nginx caching** — Vite-emitted fingerprinted assets under `/assets/` get `Cache-Control: public, immutable` and `expires 1y`. JSON data files (`/issues_full.json`, `/issues.json`, `/search_index.json[.gz]`) get `no-cache, must-revalidate` so conditional GETs (304) still avoid re-downloading an unchanged file.
- **Manual chunking** — `vite.config.ts` puts `react`, `react-dom`, and `react-router-dom` into a `vendor` chunk.
- **Lazy `ArticleViewer`** — the article-rendering code is in a `React.lazy` chunk that only loads when the user opens an article.

---

## Data pipeline

*Cinefex* is a long-cancelled magazine. The 169 issues in this archive are
the complete, finite set; nothing new will be added. The metadata
(`public/issues.json` and `public/issues_full.json`) is **committed to git
and hand-curated** rather than regenerated on every build. The runtime
container is a pure nginx serve — no Python, no in-container metadata
extraction.

### How the JSON files are produced

> **⚠️  `create_json.py` is DEPRECATED.** The archive is finite and the
> JSON metadata is hand-curated and committed to git. Running this script
> is **destructive** — it overwrites `public/issues.json` and
> `public/issues_full.json` with raw extraction output, discarding the
> 99 hand-corrections made for department-style articles in issues 50-63
> and any other one-off JSON fixes. The only safe use today is
> `build_search_index()` against an already-correct `issues_full.json`,
> to rebuild the gitignored `search_index.json`. See the long deprecation
> notice at the top of `create_json.py` for details.

`create_json.py` is the original extraction script. It is kept in the
repo for two reasons:

1. **One-shot regeneration from scratch.** If you ever need to rebuild the
   metadata (e.g. after a bulk find-and-replace pass on the source HTML),
   the script can be run. The script walks every
   `issues/{N}/manifest.xml`, parses the `<article>` / `<readingView>` /
   `<imageGallery>` sections, reads each article's
   `<meta name="Film">` / `<meta name="Title">` /
   `<articleTitle>` element, applies the `clean_article_title` helper
   (see below), and writes the three output files:
   - `public/issues_full.json` (all 169 issues, sorted)
   - `public/issues.json` (issues 1–126 only; used by the legacy
     `check_article_names.py` validator)
   - `public/search_index.json` (+ `.gz`)
2. **Sanity-checking a regen.** The script is the source of truth for the
   `(issue, articleIndex)` tuple layout that the rest of the app expects.
   If you do regenerate, diff its output against the committed JSONs to
   surface the things that need hand-correction.

The script is **not** wired into `npm run build`, is not installed in the
runtime container, and does not run on container start. The `__main__`
guard at the bottom of the file now prints a 5-second warning before
executing `create_issues_json()`. See the
[Container image & runtime](#container-image--runtime) section for the
runtime flow.

### `clean_article_title` — the one piece of nontrivial logic

The publisher's iPad-team source HTML is inconsistent in how it fills
`<meta name="Title">`. For most articles it contains a clean subtitle
distinct from the film name in `<meta name="Film">` (e.g. Film = "Tron",
Title = "Tronic Imagery"). For others, the title field is a
"Film — Subtitle" duplication (e.g. Film = "Brainstorm", Title =
"Brainstorm — Getting the Cookie at the End"), or an embedded
"X of/on/in Y" construction that legitimately contains the subject
(e.g. "The Effects of Beetlejuice", "Dancing on the Edge of the Abyss",
"Visions of the Hereafter"). The first two cases need the duplicated
subject stripped; the third must be left alone.

`clean_article_title(title, subject)` in `create_json.py` is the rule:

1. Empty / whitespace-only title → drop.
2. Title equals subject (case-insensitive) → drop.
3. Title starts with `subject <separator> …` (where `<separator>` is any
   of `-`, `–`, `—`, `:`, `|`) → strip the subject and the leading
   separator(s).
4. Mid-string or trailing subject occurrences are **never** stripped —
   they would destroy meaningful content.

The same rule is mirrored client-side in
`src/utils/articleDisplay.ts` as `displayTitle(name, articleTitle)`, so
that a hand-edited or future-regenerated JSON file never renders a
duplicated subject on the article-list button.

### Hand-correction workflow

For most rows the JSON is correct as extracted. When it isn't:

1. Identify the affected article in `public/issues_full.json` (and
   `public/issues.json`).
2. Edit both files: set `name` to the film/subject, set `articleTitle`
   to a distinct subtitle (or delete the key if there's no distinct
   subtitle). The `Article` type in `src/types/index.ts` documents the
   shape.
3. Run `npm test` to confirm the `displayTitle` helper is still in
   agreement, then `npm run typecheck && npm run lint`.
4. Commit. (If you skipped step 1 and regenerated from scratch, the
   `clean_article_title` rules above mean most issues resolve
   automatically; only the genuinely-hand-curated rows remain.)

### Department-article class (issue 61 and others)

The 50-63 run of issues contains "department" articles (Quick Cuts,
Special Venues, Commercial Spot, Video Beat, Effects Scene, Profile,
Immortal Images, etc.) where the publisher stored the article title in
`<meta name="Film">` rather than a film name. For these the `name` field
in the JSON is the article title (wrong shape), and `articleTitle` is
either empty or a meaningless truncation. There is no algorithmic fix
that captures every case (e.g. "Kirk Out" has no department prefix to
extract) — these have to be hand-curated by reading the article content
and determining the actual subject. See
`SUBAGENT_PROMPT_ASSIGN_SUBJECTS.md` and `SUBAGENT_DEPT_ARTICLES.txt`
for a 99-article inventory across the affected issues.

### Search index details

The search index in `public/search_index.json` powers full-text mode. It is:

- **Gitignored** and **not** built by `npm run build` — `npm run build` is metadata-free.
- Built on demand by `npm run search:index` (which calls
  `python3 create_json.py`). Once built, the file is committed to the
  runtime image (it lives in `public/`, which Vite copies into `dist/`).
- Generated by stripping HTML tags (`TextExtractor` in `create_json.py`,
  which discards `<script>` / `<style>` / `<noscript>` content and
  condenses whitespace) and writing one record per `(issue, articleIndex)`
  pair.
- Per-article body text is truncated to `max_chars_per_doc` (24 kB by
  default) to keep the shipped payload small. The vast majority of
  articles fit completely; only the longest 127+ features get clipped,
  and the text near the start is usually the most search-relevant anyway
  (article openings, byline, intro).
- Loaded **lazily** by the client (`useSearchIndex`), and **only** when
  the user switches to full-text mode. In the default title mode, the
  index is never fetched, so the wire payload stays at zero.
- A `.gz` sibling is also written, and the nginx config enables
  `gzip_static` for `application/json` so the file ships compressed over
  the wire (~6 MB gzipped for ~766 documents).
- Built with [MiniSearch](https://lucaong.github.io/minisearch/) on the
  client. The index file is a plain JSON array; the MiniSearch in-memory
  index is built from it at first load. Field boosting: `articleTitle`
  (2×) > `name` (1.5×) > `text` (1×). Fuzzy matching with edit distance
  0.2 is enabled for typo tolerance.

### Build-time tooling

**`scripts/convert-covers-to-webp.js`** — wraps the system `cwebp` binary to produce a `cover512.webp` sibling for every `cover512.jpg`. Idempotent: skips files whose JPEG mtime is older than the WebP. Supports `--check` (exit non-zero if any cover needs conversion) and an explicit list of issue numbers. Quality is `-q 82` (perceptual sweet spot). Run as part of `npm run build` or manually via `npm run covers:webp`.

**`scripts/normalize-issue-fonts.js`** — one-time mechanical fix for 127+ issues whose on-disk font filenames don't match what the in-issue `Cinefex.css` `@font-face` rules expect (e.g. `Benguiat-Book.otf` on disk vs `BenguiatStd-Book.otf` in the CSS). Creates the expected filenames as copies inside each issue's `fonts/` folder, without touching or deleting the originals. Idempotent. Defaults to processing issues 127–169; accepts a specific list of issue numbers as arguments. Pre-127 issues are skipped (their font files are in the top-level `fonts/` directory).

---

## Container image & runtime

The multi-stage `Dockerfile` produces a self-contained nginx-based image:

- **Builder stage** — `node:20-bookworm`. Runs `npm ci --include=dev`,
  strips the dev-only `public/covers` and `public/issues` symlinks
  (which point at `../covers` and `../issues` on a Mac but not in CI),
  replaces them with empty placeholders, and runs `tsc -b && vite build`.
  The `--include=dev` flag is required so `vite` and
  `@tailwindcss/postcss` are present during the build. No Python is
  installed in the builder.
- **Runtime stage** — `nginx:1.27-alpine`. Copies the builder's `dist/`,
  the baked `covers/`, the `docker/nginx.conf`, and the
  `docker/entrypoint.sh` (renamed to `40-cinefex.sh` so it chains onto
  the base image's own `/docker-entrypoint.d/` scripts before nginx
  starts). No Python, no `create_json.py` — the JSON metadata is baked
  into the image as part of `dist/`.
- **Healthcheck** — `wget -qO/dev/null http://localhost/issues_full.json`
  (the `nginx:alpine` base image ships `wget` natively, so we don't
  need Python or `curl` to be added). The same check is wired into
  `docker-compose.yml`.

The entrypoint (`docker/entrypoint.sh`) is now minimal:

1. Waits up to 30 s for `ISSUES_DIR` to be bind-mounted and non-empty
   (unraid occasionally races the share mount).
2. `rm -rf`s the docroot's empty `issues/` placeholder and `ln -sfn`s
   the bind-mounted issues tree over it. (`$DOCROOT/covers` is already
   populated at build time and doesn't need a runtime symlink.)
3. Exits 0 so the base image's own `/docker-entrypoint.sh` starts nginx.

The image is published as `linux/amd64` only (see [Known limitations](#known-limitations)).

---

## Deployment

### Local (`docker compose`)

`docker-compose.yml` is a 1:1 mirror of the unraid container setup (same bind mount, same exposed port) so a successful `docker compose up` here is a faithful preview of what unraid will run.

```bash
# 1. Point ISSUES_PATH below at a directory containing numbered issue
#    subdirs (1, 2, ..., N) with manifest.xml + *.html files. An empty
#    dir is fine for testing the UI shell; the entrypoint will wait up
#    to 30s for content.
ISSUES_PATH=./.docker-issues docker compose up --build
# 2. Open http://localhost:8586
```

The host port `8586` matches the unraid template and the existing NginxProxyManager upstream at `192.168.0.99:8586`.

### unraid

1. Make sure your `issues/` share exists at `/mnt/user/issues/` (or update the template's "Issues Share" path).
2. Add a container in unraid with this Template URL:
   `https://raw.githubusercontent.com/DJCallyman/Cinefex-Online/main/unraid/cinefex-online.xml`
3. The template pre-fills: image, port 8586, the issues volume, and a handful of env vars. Adjust as needed and click Apply.
4. In Nginx Proxy Manager, add a new Proxy Host that forwards your chosen hostname to the container's IP on port 8586.

### Reverse proxy & HTTPS

The container-internal nginx binds to plain HTTP on port 80 only. NPM terminates TLS upstream; the bundled `docker/nginx.conf` deliberately does not set HSTS or any other header that would assume an HTTPS context. (See the HSTS note in `.htaccess.example` for the rationale.)

### Plain Apache (`/var/www` + `.htaccess`)

If you prefer a manual deploy:

1. `npm run build` — produces `dist/`.
2. Upload the contents of `dist/` to your web server's document root.
3. Also upload (or keep in sync):
   - `covers/` (all issue cover images)
   - `fonts/` (if not already in `dist/fonts`)
   - `issues/` (the entire article HTML tree)
4. (Optional) If you want full-text search, also upload
   `public/search_index.json` and `public/search_index.json.gz` from the
   `dist/` bundle. Title-mode search works without them.
5. Place your real `cinefex.htpasswd` file on the server.
6. Copy `.htaccess.example` to `.htaccess` and set the correct absolute path in `AuthUserFile`.
7. (Recommended) Serve over HTTPS. HSTS is intentionally **not** enabled — see the comment in `.htaccess.example` for the rationale (irreversibility risk if HTTPS is ever misconfigured).

### Updating the image

unraid pulls `:latest` on container restart. To pick up the latest build, stop and start the container (right-click → Restart works too).

The issues share is bind-mounted, so the running image always reads
article HTML directly from it — no rebuild required for changes to the
*article content* under `issues/`.

**But** because the metadata in `public/issues.json` and
`public/issues_full.json` is now baked into the image at build time,
*metadata* changes (renaming an article, fixing a typo in a subject,
reassigning a department article to its real film, etc.) **do** require
an image rebuild. Edit the JSON, commit, push to `main`, wait for the
GHCR build, then restart the container. The bind-mounted `issues/` tree
is unaffected.

### Environment variables

| Name | Default | Description |
|------|---------|-------------|
| `ISSUES_DIR` | `/issues` | Container path the issues share is bind-mounted to. |
| `PORT` | `8080` | Internal port the static server listens on (legacy / non-unraid; the bundled `docker/nginx.conf` and `docker-compose.yml` use container port 80 / host port 8586). |
| `TZ` | (unset) | Container timezone. |

The unraid template's `Web Port` (host `8586` → container `80`) and `Issues Share` (default `/mnt/user/issues`) are exposed as configurable template fields, not env vars.

---

## Testing

```bash
npm test           # Vitest single run (jsdom env)
npm run test:watch # Vitest watch mode
```

Test files live next to the code they exercise, in `__tests__/` folders (e.g. `src/utils/__tests__/bookmarks.test.ts`, `src/components/search/__tests__/SearchBar.test.tsx`, `src/context/__tests__/ArchiveContext.test.tsx`). The shared setup file is `src/test/setup.ts`. Vitest globals are enabled (`environment: 'jsdom'`, `globals: true`).

Coverage focuses on the high-leverage pure functions and the contexts: bookmarks, search index, highlight, nav, theme, the search bar, the archive context, and `styleInjection`. The viewer/modal components are mostly rendered in the Vitest jsdom env and asserted on behaviour rather than visual layout.

CI is not currently configured to run tests on every push — only the GHCR image build triggers on `main` (see `.github/workflows/image.yml`). Run `npm test` locally before opening a PR.

---

## Browser support

- Chrome / Chromium (recommended)
- Firefox 103+
- Safari 15+
- Edge
- Modern mobile browsers

The cover grid, modal, and viewer have been designed for desktop and tablet; phone layouts work but are not the primary target.

---

## Security notes

- **Two-tier Content-Security-Policy** in `.htaccess.example`, applied by URL prefix via two mutually-exclusive `<If>` blocks (because `<Location>` is not allowed in `.htaccess` context — it requires server-config or virtual-host context):
  - **Tight policy** for the host page (`style-src 'self'`, no `'unsafe-inline'`). The host app is built by Vite + Tailwind v4 and ships only a single linked stylesheet, no inline `<style>` and no inline event handlers.
  - **Looser policy** for `/issues/` article iframes (`style-src 'self' 'unsafe-inline'`). `styleInjection.ts` dynamically appends `<style>` blocks to those iframe documents at runtime, which requires `'unsafe-inline'` for `style-src`. Without it, the combined-archival-view feature for issues 127+ breaks.
  - Both policies close two common injection vectors with `base-uri 'self'` and `form-action 'self'`, and both redundantly set `frame-ancestors 'self'` alongside `X-Frame-Options: SAMEORIGIN` for defense in depth.
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- HSTS is intentionally **not** enabled. Once a browser caches HSTS for a domain, the policy is effectively irreversible for the `max-age` period. If the certificate, hosting, or HTTPS setup is ever misconfigured, users with cached HSTS would be locked out until the policy expires. Until a stable, monitored HTTPS deployment is in place, leave HSTS off.
- No inline event handlers in the React codebase
- `cinefex.htpasswd` is gitignored; only the example template is committed
- The article iframes are served from the same origin as the host page, so no cross-origin restrictions apply.

---

## Known limitations

- No offline support (articles require network access).
- `issues/` is too large for git and is intentionally excluded; it is deployed as a bind mount on the runtime container or uploaded manually for a plain Apache deploy.
- `linux/amd64` only — the GHCR image is not multi-arch. ARM hosts (e.g. Raspberry Pi) need a local build.
- The application is read-only; there is no user-generated content or favourites system, only per-browser local bookmarks.
- Apache `.htaccess` is the only security-headers source for the manual deploy. The bundled nginx config in `docker/nginx.conf` intentionally does not set headers, on the assumption that the reverse proxy upstream (NPM) terminates TLS and can add them; if you serve the container directly over plain HTTP, you will not have CSP or XFO headers.
- Metadata is baked into the image (see [Data pipeline](#data-pipeline)). Editing `public/issues.json` requires an image rebuild + container restart to take effect for users.

## Future enhancements (aspirational)

- Service worker / offline support
- Per-build nonce-based CSP for the `/issues/` iframe style injection (so `style-src` can drop `'unsafe-inline'` from the iframe policy)
- Multi-arch (`linux/arm64`) image

---

## License

All Cinefex magazine content remains the property of its respective copyright holders. This project is a non-commercial archival browser.

---

*This README reflects the current React + Vite architecture (post-2026 migration, full-text search, bookmarks, and theming).*
