import xml.etree.ElementTree as ET
import json
import os
import re
import sys
from html.parser import HTMLParser
from typing import Optional


class MetadataExtractor(HTMLParser):
    """HTML parser to extract metadata from HTML files including Film, Title, and articleTitle"""

    def __init__(self):
        super().__init__()
        self.in_article_title = False
        self.article_title_text = None
        self.meta_title = None
        self.meta_film = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # Check for <meta name="Title" content="..."/>
        if tag == 'meta' and attrs_dict.get('name', '').lower() == 'title':
            self.meta_title = attrs_dict.get('content', '')

        # Check for <meta name="Film" content="..."/>
        if tag == 'meta' and attrs_dict.get('name', '').lower() == 'film':
            self.meta_film = attrs_dict.get('content', '')

        # Check for <articleTitle>
        if tag.lower() == 'articletitle':
            self.in_article_title = True
            self.article_title_text = ''

    def handle_endtag(self, tag):
        if tag.lower() == 'articletitle' and self.in_article_title:
            self.in_article_title = False

    def handle_data(self, data):
        if self.in_article_title:
            self.article_title_text = (self.article_title_text or '') + data.strip() + ' '

    def get_title(self) -> Optional[str]:
        """Return the best available title, preferring meta title"""
        if self.meta_title:
            return self.meta_title.strip()
        if self.article_title_text:
            # Clean up the articleTitle text (remove extra whitespace)
            return ' '.join(self.article_title_text.split())
        return None

    def get_film(self) -> Optional[str]:
        """Return the Film metadata (movie/subject name shown in iPad app)"""
        if self.meta_film:
            return self.meta_film.strip()
        return None


class TextExtractor(HTMLParser):
    """HTML parser that strips all tags and returns plain text.

    Used for full-text search indexing. We discard script/style contents
    and condense whitespace so the index stays small.
    """

    SKIP_TAGS = {'script', 'style', 'noscript'}

    def __init__(self):
        super().__init__()
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self.SKIP_TAGS:
            self._skip_depth += 1
            return
        # Block-level tags get a space so concatenated text reads naturally
        if tag.lower() in {'p', 'div', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'page'}:
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag.lower() in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if tag.lower() in {'p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'page'}:
            self.parts.append(' ')

    def handle_data(self, data):
        if self._skip_depth == 0:
            self.parts.append(data)

    def get_text(self) -> str:
        # Collapse runs of whitespace to a single space
        return ' '.join(''.join(self.parts).split())


def extract_metadata_from_html(file_path: str) -> dict[str, Optional[str]]:
    """Extract metadata (Film, Title, articleTitle) from an HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        parser = MetadataExtractor()
        parser.feed(content)
        return {
            'film': parser.get_film(),
            'title': parser.get_title()
        }
    except Exception as e:
        print(f"Warning: Failed to extract metadata from {file_path}: {e}", file=sys.stderr)
        return {'film': None, 'title': None}


def fix_xml_ampersands(xml_content: str) -> str:
    """
    Fix unescaped ampersands in XML content.
    Replaces & with &amp; but avoids double-escaping existing entities.
    """
    # Replace & that is not already part of an entity (like &amp; &lt; &gt; &quot; &apos; or numeric &#123;)
    return re.sub(r'&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)', '&amp;', xml_content)

def create_issues_json() -> None:
    """
    Parses manifest.xml and cover.html files from issue folders (1-169)
    and writes the metadata to public/issues_full.json and public/issues.json.

    Run from anywhere; the script anchors itself to its own directory
    so paths to ./issues/, ./public/issues_full.json, ./public/issues.json
    are always resolved relative to the script, not the caller's CWD.

    Files are written into public/ (not the project root) so Vite's build
    copies them into dist/ alongside the bundled JS/CSS. The app's runtime
    fetch of /issues_full.json then resolves correctly in both dev and
    production.
    """
    # Anchor to the script's own directory so this works from any CWD
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    all_issues_data = []
    issues_base_dir = os.environ.get('ISSUES_BASE_DIR', 'issues')

    print("Starting to process issue folders...")

    for i in range(1, 170):
        issue_dir = os.path.join(issues_base_dir, str(i))
        manifest_path = os.path.join(issue_dir, 'manifest.xml')

        if not os.path.exists(manifest_path):
            print(f"Warning: manifest.xml not found for issue {i}. Skipping.")
            continue

        try:
            # --- Parse manifest.xml ---
            # Read and fix any unescaped ampersands before parsing
            with open(manifest_path, 'r', encoding='utf-8', errors='ignore') as f:
                xml_content = f.read()
            xml_content = fix_xml_ampersands(xml_content)
            root = ET.fromstring(xml_content)

            issue_number = root.find('issueNumber').get('value')
            publication_date = root.find('publicationDate').get('value')
            year = int(publication_date.split()[-1])

            articles_data = []
            article_names = []

            # Get all archival articles from manifest
            archival_articles = root.findall('.//article')

            # Build lookup dicts from manifest sections (used for reading views + image galleries)
            reading_views = {view.get('name'): view.get('value') for view in root.findall('.//readingView')}
            image_galleries = {g.get('name'): g.get('value') for g in root.findall('.//imageGallery')}

            for article in archival_articles:
                manifest_name = article.get('name')  # Name from manifest (may be incorrect)
                archive_url = article.get('value')
                
                # Extract article number from filename (e.g., "1.ArchivalView.html" -> "1")
                # and construct the corresponding reading view filename
                article_num_match = re.match(r'^(\d+)\.ArchivalView\.html$', archive_url)
                if article_num_match:
                    article_num = article_num_match.group(1)
                    reading_url = f"{article_num}.ReadingView.html"
                else:
                    # Fallback: try to find reading view by manifest name (old behavior)
                    reading_url = reading_views.get(manifest_name)
                
                if reading_url:
                    reading_file_path = os.path.join(issue_dir, reading_url)
                    
                    # Check if the reading file exists
                    if not os.path.exists(reading_file_path):
                        continue
                    
                    # Extract metadata from the HTML file
                    metadata = extract_metadata_from_html(reading_file_path)
                    
                    # Use Film from HTML (what iPad displays) if available, otherwise fall back to manifest
                    article_name = metadata['film'] if metadata['film'] else manifest_name
                    article_title = metadata['title']
                    
                    article_data = {
                        "name": article_name,  # Movie/subject name (from HTML's Film meta tag)
                        "readingUrl": f"issues/{i}/{reading_url}",
                        "archiveUrl": f"issues/{i}/{archive_url}"
                    }
                    
                    # Image gallery lookup (for 127+ combined Original Layout views)
                    # Try exact match first, then case-insensitive fallback to handle known capitalization mismatches
                    # (e.g. "The Finest hours" vs "The Finest Hours", "The 5th wave" vs "The 5th Wave")
                    gallery_url = image_galleries.get(manifest_name)
                    if not gallery_url and manifest_name:
                        manifest_lower = manifest_name.lower()
                        for gname, gval in image_galleries.items():
                            if gname and gname.lower() == manifest_lower:
                                gallery_url = gval
                                break
                    
                    if gallery_url:
                        article_data["imageGalleryUrl"] = f"issues/{i}/{gallery_url}"
                    
                    # Add articleTitle only if it's different from the name
                    if article_title and article_title.lower() != article_name.lower():
                        article_data["articleTitle"] = article_title
                    
                    articles_data.append(article_data)
                    article_names.append(article_name)

            issue_title = " / ".join(article_names)

            # Skip issues with no usable HTML articles on disk. This prevents
            # cover-only entries (e.g. /covers/N/ exists but /issues/N/ has no
            # ReadingView HTML files) from being listed in the web app.
            if not articles_data:
                print(f"Skipping issue {i}: no HTML articles on disk (cover-only entry)")
                continue

            issue_data = {
                "issue": int(issue_number),
                "title": issue_title,
                "year": year,
                "articles": articles_data
            }
            all_issues_data.append(issue_data)
            print(f"Successfully processed issue {i}")

        except Exception as e:
            print(f"Error processing manifest for issue {i}: {e}")

    all_issues_data.sort(key=lambda x: x['issue'])

    # Output all issues to public/issues_full.json (so Vite copies it into dist/).
    # We also write a copy at the project root for backwards compatibility with
    # any external tooling that still references the legacy path.
    os.makedirs('public', exist_ok=True)
    full_output_path = 'public/issues_full.json'
    with open(full_output_path, 'w', encoding='utf-8') as f:
        json.dump(all_issues_data, f, indent=4)
    print(f"Full archive ({len(all_issues_data)} issues) saved to {full_output_path}")

    # Output only issues 1-126 to public/issues.json
    issues_126 = [issue for issue in all_issues_data if issue['issue'] <= 126]
    output_path = 'public/issues.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(issues_126, f, indent=4)
    print(f"Issues 1-126 ({len(issues_126)} issues) saved to {output_path}")

    print(f"\nProcessing complete.")

def build_search_index(
    issues_data: list[dict],
    issues_base_dir: str | None = None,
    max_chars_per_doc: int = 24000,
) -> None:
    """Walk every ReadingView HTML file referenced in `issues_data`, strip
    tags, and emit `public/search_index.json` (which Vite copies into
    the dist/ output) for the client to load lazily on first search.

    The schema is intentionally simple — one record per (issue, articleIndex)
    pair — so the client can build a MiniSearch index from it at runtime.

    Per-document text is truncated to `max_chars_per_doc` to keep the
    shipped payload under ~2 MB. The vast majority of articles are well
    under 8 kB of text and fit completely; only the longest 127+ features
    get clipped, and the text near the start is usually the most
    search-relevant anyway (article openings, byline, intro).
    """
    if issues_base_dir is None:
        issues_base_dir = os.environ.get('ISSUES_BASE_DIR', 'issues')

    import datetime
    import html

    documents: list[dict] = []
    skipped = 0
    truncated = 0

    for issue in issues_data:
        issue_num = issue['issue']
        for article_index, article in enumerate(issue.get('articles', [])):
            reading_url = article.get('readingUrl', '')
            # reading_url looks like "issues/3/1.ReadingView.html"
            filename = os.path.basename(reading_url)
            full_path = os.path.join(issues_base_dir, str(issue_num), filename)
            if not os.path.exists(full_path):
                skipped += 1
                continue
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    raw = f.read()
                parser = TextExtractor()
                parser.feed(raw)
                text = parser.get_text()
            except Exception as e:
                print(f"Warning: failed to index issue {issue_num} article {article_index}: {e}",
                      file=sys.stderr)
                skipped += 1
                continue

            if not text.strip():
                skipped += 1
                continue

            if len(text) > max_chars_per_doc:
                text = text[:max_chars_per_doc]
                truncated += 1

            documents.append({
                'id': f"{issue_num}/{article_index}",
                'issue': issue_num,
                'articleIndex': article_index,
                'name': html.unescape(article.get('name', '')),
                'articleTitle': html.unescape(article.get('articleTitle', '') or ''),
                'year': issue.get('year', 0),
                'text': text,
            })

    payload = {
        'version': 1,
        'generatedAt': datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z'),
        'documentCount': len(documents),
        'maxCharsPerDoc': max_chars_per_doc,
        'documents': documents,
    }

    public_dir = 'public'
    os.makedirs(public_dir, exist_ok=True)
    output_path = os.path.join(public_dir, 'search_index.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))

    # Also write a gzipped copy for servers that serve it with Content-Encoding.
    try:
        import gzip
        with open(output_path + '.gz', 'wb') as gz:
            with gzip.open(gz, 'wt', encoding='utf-8', compresslevel=6) as g:
                g.write(json.dumps(payload, ensure_ascii=False, separators=(',', ':')))
    except Exception as e:
        print(f"Warning: could not write gzipped index: {e}", file=sys.stderr)

    raw_size = os.path.getsize(output_path)
    gz_size = os.path.getsize(output_path + '.gz') if os.path.exists(output_path + '.gz') else 0
    print(
        f"Search index ({len(documents)} documents, {skipped} skipped, "
        f"{truncated} truncated to {max_chars_per_doc} chars) saved to {output_path} "
        f"(raw {raw_size} bytes, gz {gz_size} bytes)"
    )


if __name__ == '__main__':
    # Anchor to script dir so relative paths work from any CWD
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    create_issues_json()
    # Re-load the freshly written full archive to build the search index
    # in the same run.
    with open('public/issues_full.json', 'r', encoding='utf-8') as f:
        all_issues = json.load(f)
    build_search_index(all_issues)
