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
- **Responsive Design**: Works on desktop and tablet devices
- **Password Protection**: HTTP Basic Authentication via `.htpasswd`

## Directory Structure

```
Cinefex-Online/
├── create_json.py          # Python script to generate metadata JSON from HTML/XML
├── check_article_names.py  # Utility to validate article naming
├── index.html              # Main web interface
├── issues.json             # Metadata for issues 1-126 (primary dataset)
├── issues_full.json        # Metadata for all 169+ issues
├── cinefex.htpasswd        # Password file for HTTP Basic Auth
├── covers/                 # Magazine cover images and styling
├── issues/                 # Individual issue directories
│   ├── 1/                  # Issue 1
│   │   ├── 1.ReadingView.html
│   │   ├── 1.ArchivalView.html
│   │   ├── 2.ReadingView.html
│   │   └── 2.ArchivalView.html
│   ├── 2/, 3/, ...         # More issues
│   └── 169/
├── fonts/                  # Custom fonts (Benguiat, Gill Sans)
└── js/                     # JavaScript utilities
```

## Technical Architecture

### Backend (Python)

**`create_json.py`** - Core metadata extraction tool:
- Parses `manifest.xml` files from each issue directory
- Extracts metadata from HTML article files using `HTMLParser`:
  - `<meta name="Film">` - Movie/subject name
  - `<meta name="Title">` - Article title
- Matches articles by filename number (not manifest names)
- Generates two JSON outputs:
  - `issues.json` - Issues 1-126 (main public dataset)
  - `issues_full.json` - All 169+ issues

**`check_article_names.py`** - Validation utility:
- Verifies article naming consistency across manifest and HTML files
- Helps identify metadata discrepancies

### Frontend (HTML/CSS/JavaScript)

**`index.html`** - Single-page application interface:
- **Modal System**: Displays issues list, article list, and view options
- **Dual Viewers**: Separate iframe loaders for reading and archival views
- **Dynamic Styling Injection**: Applies responsive fixes to old/new format articles:
  - `injectOldReadingViewStyles()` - Fixes reading view layout issues
  - `injectOldArchivalViewStyles()` - Handles archival view cropping
  - `injectNewReadingViewStyles()` - Modern format support
- **Event Handlers**: Article selection, view mode switching, navigation
- **Tailwind CSS**: Modern responsive styling

### JSON Data Structure

Each article object contains:
```json
{
  "name": "Film/Subject Name",
  "articleTitle": "Full Article Title",
  "readingUrl": "issues/1/1.ReadingView.html",
  "archiveUrl": "issues/1/1.ArchivalView.html"
}
```

Issue wrapper structure:
```json
{
  "issue": 1,
  "title": "Issue Title",
  "articles": [...]
}
```

## Workflow

### Adding/Updating Articles

1. **Place Files**: Add issue directories under `issues/` with HTML files named `N.ReadingView.html` and `N.ArchivalView.html`
2. **Add Metadata**: Include `<meta name="Film">` and `<meta name="Title">` tags in HTML files
3. **Create Manifest**: Add `manifest.xml` file listing article information
4. **Generate JSON**: Run `python create_json.py` to update `issues.json`
5. **Verify**: Run `python check_article_names.py` to validate consistency

### Deployment

1. **HTTP Server**: Serve the project directory via a web server (Apache, Nginx, etc.)
2. **Authentication**: Configure `.htpasswd` with HTTP Basic Auth credentials
3. **HTTPS**: Recommended for production deployment
4. **Static Files**: All content is static - no backend server required beyond serving files

## Key Technical Decisions

- **Index-based Article Selection**: Articles are retrieved by index position rather than serialized JSON to avoid issues with special characters (em-dashes) in film names
- **Dual JSON Outputs**: Maintains both `issues.json` (1-126) and `issues_full.json` (all issues) for flexibility
- **Metadata Extraction**: Prioritizes HTML meta tags over manifest.xml for accuracy (matches iPad app behavior)
- **Dynamic Styling**: Applies format-specific CSS fixes to handle legacy layout issues without modifying original files

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- HTTP Basic Authentication via `.htpasswd`
- Static file serving (no dynamic code execution)
- Content Security Policy recommendations for production

## Future Enhancements

- Search functionality across article titles
- Issue year/date filtering
- Bookmark/favorites system
- PDF export support
- Full-text search implementation
- API endpoint for external integrations

## License

Refer to individual issue copyrights - Cinefex magazine content is proprietary.

## Contact & Support

For issues or questions about this archive interface, please refer to the project repository.
