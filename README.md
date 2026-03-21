# Cinefex-Online

A web front end to access the archive of Cinefex magazines. This project provides an interactive interface to browse and view digitized issues of Cinefex magazine, including both reading-optimized and archival layout views.

## Project Overview

Cinefex-Online is a full-stack archive browser designed to make the extensive Cinefex magazine collection accessible online. The project includes articles from 169+ issues of Cinefex, a renowned publication covering visual effects and cinematography in film.

### Key Features

- **Dual View Modes**: Each article can be viewed in two formats:
  - **Reading View**: Optimized layout for comfortable online reading
  - **Original Layout**: Archival view showing the magazine's original design
- **Issue Browser**: Browse by issue number with article listings
- **Article Metadata**: Display both film/subject names and full article titles
- **Search**: Filter by film name, issue number, year, or article title
- **Deep Linking**: Share links to specific issues via URL hash routing
- **Responsive Design**: Works on desktop and tablet devices
- **Keyboard Accessible**: Full keyboard navigation with ARIA support
- **Offline Support**: Service worker caches previously viewed content
- **Password Protection**: HTTP Basic Authentication via `.htpasswd`

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- Python 3.8+ (for metadata generation)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens a local dev server with hot reloading.

### Build for Production

```bash
npm run build
```

Outputs optimized files to `dist/`. The build:
- Compiles Tailwind CSS at build time (no CDN dependency)
- Bundles and minifies all JavaScript modules
- Tree-shakes unused code
- Hashes asset filenames for cache-busting

### Linting

```bash
npm run lint          # ESLint
npm run format        # Prettier
```

## Directory Structure

```
Cinefex-Online/
├── index.html              # Main web interface
├── sw.js                   # Service worker for offline support
├── vite.config.js          # Vite build configuration
├── postcss.config.js       # PostCSS + Tailwind CSS pipeline
├── eslint.config.js        # ESLint flat config
├── .prettierrc             # Prettier formatting rules
├── .htaccess               # Apache security headers & caching
├── package.json            # npm scripts and dependencies
├── create_json.py          # Python script to generate metadata JSON
├── check_article_names.py  # Utility to validate article naming
├── issues_full.json        # Metadata for all 169+ issues
├── issues.json             # Legacy: metadata for issues 1-126
├── css/
│   ├── tailwind.css        # Tailwind CSS v4 entry point
│   ├── styles.css          # Custom styles (animations, focus, print)
│   └── fonts.css           # Centralized @font-face declarations
├── js/
│   ├── app.js              # Application entry point
│   ├── archive.js          # Data loading and grid rendering
│   ├── modal.js            # Issue detail modal and article selection
│   ├── viewer.js           # Article iframe viewer with style injection
│   ├── search.js           # Search/filter functionality
│   ├── router.js           # Hash-based URL routing
│   ├── config.js           # Centralized configuration constants
│   └── types.js            # JSDoc type definitions
├── covers/                 # Magazine cover images (one per issue)
├── issues/                 # Individual issue directories (gitignored)
│   └── {N}/
│       ├── {N}.ReadingView.html
│       ├── {N}.ArchivalView.html
│       └── manifest.xml
├── fonts/                  # Custom fonts (Benguiat, Gill Sans, etc.)
└── dist/                   # Build output (gitignored)
```

## Technical Architecture

### Frontend

- **Vanilla ES Modules** — no framework, 7 purpose-built modules
- **Tailwind CSS v4** — compiled at build time via PostCSS
- **Vite** — dev server, ES module bundler, and production builder

### Data Pipeline

```
manifest.xml + HTML meta tags → create_json.py → issues_full.json → Frontend
```

### Style Injection

The viewer module detects article format/view type and injects appropriate CSS into the iframe:

| Format | View | Injection Function |
|--------|------|-------------------|
| Old (≤126) | Archival | `injectOldArchivalViewStyles()` |
| Old (≤126) | Reading | `injectOldReadingViewStyles()` |
| New (≥127) | Reading | `injectNewReadingViewStyles()` |
| New (≥127) | Archival | None needed |

### URL Routing

Hash-based deep linking:
- `#issue/42` — Opens issue 42 modal
- `#issue/42/article/1/read` — Opens article 1 in reading view
- `#issue/42/article/1/archive` — Opens article 1 in archival view

### JSON Data Structure

```json
{
  "issue": 1,
  "title": "Star Trek – The Motion Picture / Alien",
  "year": 1980,
  "articles": [
    {
      "name": "Star Trek – The Motion Picture",
      "articleTitle": "Into the V'ger Maw with Douglas Trumbull",
      "readingUrl": "issues/1/1.ReadingView.html",
      "archiveUrl": "issues/1/1.ArchivalView.html"
    }
  ]
}
```

## Workflow

### Adding/Updating Articles

1. **Place Files**: Add issue directories under `issues/` with HTML files named `N.ReadingView.html` and `N.ArchivalView.html`
2. **Add Metadata**: Include `<meta name="Film">` and `<meta name="Title">` tags in HTML files
3. **Create Manifest**: Add `manifest.xml` file listing article information
4. **Generate JSON**: Run `python create_json.py` to update `issues_full.json`
5. **Verify**: Run `python check_article_names.py` to validate consistency

### Deployment

1. Build: `npm run build`
2. Deploy `dist/` directory along with `issues/`, `covers/`, and `fonts/` to your web server
3. Configure `.htpasswd` path in `.htaccess` (update `AuthUserFile`)
4. Ensure HTTPS for production (uncomment HSTS header in `.htaccess`)

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox 103+
- Safari 15+
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- HTTP Basic Authentication via `.htpasswd`
- Content Security Policy (CSP) headers
- X-Frame-Options protection
- Credentials excluded from Git tracking
- No inline event handlers (CSP-compliant)

## Future Enhancements

- Bookmark/favorites system
- PDF export support
- Full-text search implementation
- Image optimization (WebP conversion, responsive srcset)
- Dark/light mode toggle

## License

Refer to individual issue copyrights — Cinefex magazine content is proprietary.
