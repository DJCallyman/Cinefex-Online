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
    and creates a single issues.json file.
    """
    all_issues_data = []
    # Assumes the script is in the parent directory of the 'issues' folder.
    issues_base_dir = 'issues'
    
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
                    reading_views = {view.get('name'): view.get('value') for view in root.findall('.//readingView')}
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
                    
                    # Add articleTitle only if it's different from the name
                    if article_title and article_title.lower() != article_name.lower():
                        article_data["articleTitle"] = article_title
                    
                    articles_data.append(article_data)
                    article_names.append(article_name)

            issue_title = " / ".join(article_names)

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

    # Output all issues to issues_full.json
    full_output_path = 'issues_full.json'
    with open(full_output_path, 'w', encoding='utf-8') as f:
        json.dump(all_issues_data, f, indent=4)
    print(f"Full archive ({len(all_issues_data)} issues) saved to {full_output_path}")

    # Output only issues 1-126 to issues.json
    issues_126 = [issue for issue in all_issues_data if issue['issue'] <= 126]
    output_path = 'issues.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(issues_126, f, indent=4)
    print(f"Issues 1-126 ({len(issues_126)} issues) saved to {output_path}")

    print(f"\nProcessing complete.")

if __name__ == '__main__':
    create_issues_json()
