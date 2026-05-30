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
- **Password Protected** — HTTP Basic Authentication via `.htaccess` + `.htpasswd`

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
├── issues/                   # Article HTML files (ReadingView + ArchivalView per article) + manifest.xml — deployed separately, gitignored
├── fonts/                    # Custom typefaces (also copied to public/ for dev)
├── vite.config.ts
├── eslint.config.js
├── postcss.config.js
├── .prettierrc
├── .htaccess                 # Security headers, caching, compression, Basic Auth
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

The `ArticleViewer` component renders the selected article inside an `<iframe>`. A dedicated `styleInjection` service detects whether the issue is “old” (≤126) or “new” (>126) and whether the user chose Reading or Archival view, then injects the minimal CSS required for each combination.

### Focus & Accessibility

- Skip link for screen readers
- `useFocusTrap` hook used in the issue modal
- Article viewer programmatically focuses the close button on open and restores focus on close (with sensible fallback for direct URL access)
- Full keyboard support (Escape, Tab trapping, Enter/Space on covers)

### Error Handling

A root `ErrorBoundary` wraps the entire application. If any component throws, users see a friendly fallback with a “Return to Archive” button instead of a blank screen.

## Data Pipeline

1. New issue directories are added under `issues/{N}/` with:
   - `N.ReadingView.html`
   - `N.ArchivalView.html`
   - `manifest.xml`
2. Each HTML file contains `<meta name="Film">` and `<meta name="Title">` (or Dublin Core equivalents).
3. Run `python create_json.py` from the repo root. It writes `issues_full.json`.
4. Copy (or symlink) the generated `issues_full.json` into `public/` so Vite includes it in the build.
5. Run `python check_article_names.py` (optional but recommended) to validate consistency.

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
5. Edit `.htaccess` and set the correct absolute path in `AuthUserFile`.
6. (Recommended) Serve over HTTPS and enable the HSTS header in `.htaccess`.

The site is designed to run behind HTTP Basic Authentication. No credentials are stored in the repository.

## Browser Support

- Chrome / Chromium (recommended)
- Firefox 103+
- Safari 15+
- Edge
- Modern mobile browsers

## Security Notes

- Content-Security-Policy (with `unsafe-inline` only for the necessary style injection)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- Referrer-Policy
- No inline event handlers in the React codebase
- Credentials (`cinefex.htpasswd`) are gitignored

## Known Limitations

- No offline support (articles require network access)
- `issues/` and `covers/` directories are large and intentionally excluded from the Git repository
- Full-text search across article content is not implemented (only metadata search)
- The application is read-only; there is no user-generated content or favorites system

## Future Enhancements (Aspirational)

- PDF export of reading-view articles
- Image optimization (WebP, responsive images)
- Dark / light theme toggle
- Bookmark / favorites (client-side only)

## License

All Cinefex magazine content remains the property of its respective copyright holders. This project is a non-commercial archival browser.

---

*This README reflects the current React + Vite architecture (post-2026 migration and corrections).*
