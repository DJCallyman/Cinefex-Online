# Cinefex Archives

A modern web application for browsing the complete archive of *Cinefex* magazine — the journal of cinematic illusions. The site provides an interactive interface to explore 169+ issues (1980–present), with every article available in both a comfortable reading-optimized view and the original magazine layout.

## Project Overview

Cinefex Archives is a React-based front-end that makes the full digitized collection of Cinefex magazine accessible through a clean, keyboard-friendly, and deeply linkable interface.

### Key Features

- **Dual View Modes** for every article:
  - **Reading View** — reflowed, comfortable online reading experience
  - **Original Layout** — faithful archival view of the printed magazine pages
- **Issue Browser** — grid of all issues organized into 5-year buckets
- **Powerful Search** — filter by film/subject, article title, issue number, or year
- **Deep Linking** — shareable URLs for specific issues and individual articles in either view mode
- **Fully Keyboard Accessible** — skip links, focus traps, proper ARIA, Escape key handling, and focus restoration
- **Responsive Design** — works well on desktop and tablet
- **Error Resilience** — root-level error boundary prevents total app crashes
- **Password Protected** — HTTP Basic Authentication via a deployed `.htaccess` (shipped as `.htaccess.example`) + `.htpasswd`

> **Important**: This is an **always-online** application. There is no offline / PWA support. The full article content lives in a large `issues/` directory on the server and is not cached for offline use.

## Tech Stack

- **React 19** + **React Router 7** (HashRouter)
- **TypeScript** (strict)
- **Vite 6** (dev server + production bundler)
- **Tailwind CSS v4** (built via PostCSS)
- **ESLint** (flat config with full React + React Hooks + React Refresh recommended rules)

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.8+ (only needed when adding or regenerating issue metadata)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts Vite dev server with hot module replacement.

### Production Build

```bash
npm run build
```

Produces optimized output in `dist/`.

### Other Scripts

```bash
npm run preview      # Preview production build locally
npm run lint         # ESLint (strict React rules)
npm run typecheck    # TypeScript --noEmit
npm run format       # Prettier (writes to disk)
```

## Deployment

The app is packaged as a Docker image and published to
[ghcr.io/djcallyman/cinefex-online](https://ghcr.io/djcallyman/cinefex-online)
on every merge to `master`. The image is `linux/amd64` only.

### unraid

1. Make sure your `issues/` share exists at
   `/mnt/user/appdata/cinefex/issues/` (or update the template's
   "Issues Share" path).
2. Add a container in unraid with this Template URL:
   `https://raw.githubusercontent.com/DJCallyman/Cinefex-Online/master/unraid/cinefex-online.xml`
3. The template pre-fills: image, port 8080, the issues volume, and
   a handful of env vars. Adjust as needed and click Apply.
4. In Nginx Proxy Manager, add a new Proxy Host that forwards your
   chosen hostname to the container's IP on port 8080.

### Updating the image

unraid pulls `:latest` on container restart. To pick up the latest
build, stop and start the container (right-click → Restart works too).
The issues share is bind-mounted, so the new image sees your existing
issues immediately — no image rebuild required to add issues.

### Environment variables

| Name | Default | Description |
|------|---------|-------------|
| `ISSUES_DIR` | `/issues` | Container path the issues share is bind-mounted to. |
| `PORT` | `8080` | Internal port the static server listens on. |
| `TZ` | (unset) | Container timezone. |

## Project Structure

```
Cinefex-Online/
├── public/
│   ├── issues_full.json      # Archive metadata (copied here for build)
│   └── fonts/                # Custom fonts served statically
├── src/
│   ├── components/
│   │   ├── archive/          # Magazine cover grid + year buckets
│   │   ├── layout/           # Header, search, skip link, scroll-to-top
│   │   ├── modal/            # Issue detail modal + article selection + view options
│   │   ├── viewer/           # Full-screen article iframe viewer
│   │   ├── search/           # Debounced search bar
│   │   └── ErrorBoundary.tsx # Root error boundary
│   ├── context/ArchiveContext.tsx   # Global state, data loading, search filtering, year buckets
│   ├── services/styleInjection.ts   # Injects format-specific CSS into article iframes
│   ├── hooks/useFocusTrap.ts        # Reusable focus trap hook
│   ├── config/index.ts              # FORMAT_THRESHOLD, DEBOUNCE_MS, paths
│   ├── types/index.ts               # Magazine, Article, ViewMode, etc.
│   └── App.tsx, main.tsx
├── covers/                   # Magazine cover images (one per issue) — deployed separately
├── issues/                   # Issue HTML trees + manifest.xml (pre-127 and 127+ formats differ) — deployed separately, gitignored
├── fonts/                    # Custom typefaces (also copied to public/ for dev)
├── vite.config.ts
├── eslint.config.js
├── postcss.config.js
├── .prettierrc
├── .htaccess.example         # Apache config template (security headers, caching, compression, Basic Auth) — copy to .htaccess on deploy
├── create_json.py            # Python script that generates issues_full.json from manifests + HTML meta tags
├── check_article_names.py    # Validation utility
├── package.json
└── dist/                     # Production build output (gitignored)
```

## Architecture

### State & Data Flow

- `ArchiveContext` loads `/issues_full.json` once on startup.
- It computes 5-year `buckets` for the sidebar navigation and performs client-side search filtering.
- `selectedIssue` (number | null) drives the `IssueModal`.
- Article navigation uses **HashRouter** with the pattern `/article/:articleIndex/:viewMode?issue=N`.

### Article Viewing

The `ArticleViewer` component renders the selected article inside an `<iframe>`. A dedicated `styleInjection` service detects whether the issue is “old” (≤126) or “new” (>126) and whether the user chose Reading or Archival view, then injects the format-specific behavior required for that combination.

### Issue Format Split

The archive has two distinct source architectures:

- **Issues 1-126 (legacy format)**
   - Each article is represented by a paired `N.ReadingView.html` and `N.ArchivalView.html`.
   - Reading View is mostly self-contained reflowed HTML.
   - Original Layout maps directly to the archival HTML file for that article.

- **Issues 127+ (new-format / iPad-derived format)**
   - Reading View is a hybrid document. Text lives in `readingView*.html`, but some opening spreads and inline imagery are populated at runtime from related `manuscript*.html` and `imageGallery*.html` files.
   - Original Layout is based on `manuscript*.html`, and may be augmented by appending `imageGallery*.html` pages so the viewer can reconstruct the combined magazine experience.
   - The `styleInjection` service handles the extra DOM cleanup, font fixes, image population, and gallery-page composition needed for these issues.

Issue `127` is the format threshold, exposed in `CONFIG.FORMAT_THRESHOLD`.

### Focus & Accessibility

- Skip link for screen readers
- `useFocusTrap` hook used in the issue modal
- Article viewer programmatically focuses the close button on open and restores focus on close (with sensible fallback for direct URL access)
- Full keyboard support (Escape, Tab trapping, Enter/Space on covers)

### Error Handling

A root `ErrorBoundary` wraps the entire application. If any component throws, users see a friendly fallback with a “Return to Archive” button instead of a blank screen.

## Data Pipeline

1. New issue directories are added under `issues/{N}/` with a `manifest.xml` plus the article HTML files referenced by that manifest.
2. For issues `1-126`, the manifest typically points to paired `N.ReadingView.html` and `N.ArchivalView.html` files.
3. For issues `127+`, the manifest points to `readingView*.html`, `manuscript*.html`, and, when present, `imageGallery*.html` files for each article.
4. Each article HTML file contains `<meta name="Film">` and `<meta name="Title">` (or Dublin Core equivalents).
5. Run `python create_json.py` from the repo root. It writes `public/issues_full.json`, `public/issues.json`, and `public/search_index.json` (the full-text search index used by the search bar). All are gitignored. Vite's build copies `public/` into `dist/`, so the app's runtime fetch of `/issues_full.json` resolves correctly in both dev and production.
6. `npm run build` does the same: it runs `create_json.py` automatically, then bundles the React app, which copies the freshly-built `search_index.json` into `dist/`.
7. Run `python check_article_names.py` (optional but recommended) to validate consistency.

### Search modes

The search bar has two strictly-separate modes, selected via a pill toggle above the input:

- **Title / film** (default) — the original metadata-only substring filter. Matches against issue number, year, issue title, article name, and `articleTitle`. Fast, no network fetch, works in dev without a build step.
- **Full text** — searches the body text of every `*ReadingView.html` file. Lazy-loads the pre-built `search_index.json` only when the user switches to this mode, then keeps the MiniSearch in-memory index cached for the session. Shows a result count and a body-text snippet under each matching cover.

The two modes never mix. Switching modes clears the current results; the user always knows exactly what they're searching.

### Search index details

The search index in `public/search_index.json` powers full-text mode. It is:

- Built automatically by `create_json.py` on every `npm run build` (and via `npm run search:index` if you want to run it standalone).
- Generated by stripping HTML and writing one record per `(issue, articleIndex)` pair, with the body text truncated to 24 kB per article (enough to capture the byline, intro, and most of the first third — the most searchable part).
- Loaded **lazily** by the client, and **only** when the user switches to full-text mode. In the default title mode, the index is never fetched, so the wire payload stays at zero.
- A `.gz` sibling is also written, and `.htaccess.example` enables deflate for `application/json` so the file ships compressed over the wire (~6 MB gzipped for 766 documents).
- Built with [MiniSearch](https://lucaong.github.io/minisearch/) on the client. The index file is a plain JSON array — the MiniSearch in-memory index is built from it at first load. Field boosting: `articleTitle` (2×) > `name` (1.5×) > `text` (1×). Fuzzy matching with edit distance 0.2 is enabled for typo tolerance.

## Adding a New Issue (Workflow)

Follow the steps above. After the JSON is updated and placed in `public/`, a normal `npm run build` will include the new metadata.

## Deployment

1. `npm run build`
2. Upload the contents of `dist/` to your web server document root.
3. Also upload (or keep in sync):
   - `covers/` (all issue cover images)
   - `fonts/` (if not already in `dist/fonts`)
   - `issues/` (the entire article HTML tree)
4. Place your real `cinefex.htpasswd` file on the server.
5. Copy `.htaccess.example` to `.htaccess` and set the correct absolute path in `AuthUserFile`.
6. (Recommended) Serve over HTTPS. HSTS is intentionally **not** enabled — see the comment in `.htaccess.example` for the rationale (irreversibility risk if HTTPS is ever misconfigured).

The site is designed to run behind HTTP Basic Authentication. No credentials are stored in the repository.

## Browser Support

- Chrome / Chromium (recommended)
- Firefox 103+
- Safari 15+
- Edge
- Modern mobile browsers

## Security Notes

- Content-Security-Policy with two per-asset-type policies: a **tight** policy for the host page (`style-src 'self'`, no `'unsafe-inline'`); a **looser** policy for `/issues/` article iframes (`style-src 'self' 'unsafe-inline'`) to permit runtime style injection by `src/services/styleInjection.ts`. Implemented with two mutually-exclusive `<If>` blocks in `.htaccess.example` (one positive, one negated) because `<Location>` is not allowed in `.htaccess` context.
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- Referrer-Policy: `strict-origin-when-cross-origin`
- No inline event handlers in the React codebase
- Credentials (`cinefex.htpasswd`) are gitignored

## Known Limitations

- No offline support (articles require network access)
- `issues/` and `covers/` directories are large and intentionally excluded from the Git repository
- The application is read-only; there is no user-generated content or favorites system

## Future Enhancements (Aspirational)

- Service worker / offline support
- Per-build nonce-based CSP for the `/issues/` iframe style injection (so `style-src` can drop `'unsafe-inline'` from the iframe policy)

## License

All Cinefex magazine content remains the property of its respective copyright holders. This project is a non-commercial archival browser.

---

*This README reflects the current React + Vite architecture (post-2026 migration and corrections).*
