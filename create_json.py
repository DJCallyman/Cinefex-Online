import xml.etree.ElementTree as ET
import json
import os
import re

def find_cover_image(html_content):
    """
    Parses HTML content to find the first image source,
    checking for both <img> tags and background: url() styles.
    """
    # First, try to find an <img> tag's src attribute.
    img_match = re.search(r'<img[^>]+src="([^"]+)"', html_content, re.IGNORECASE)
    if img_match:
        return img_match.group(1)
    
    # If no <img> tag, try to find a background url.
    # This regex looks for url(...) and captures the content inside.
    bg_match = re.search(r'url\(([^)]+)\)', html_content, re.IGNORECASE)
    if bg_match:
        # The result might have quotes (e.g., url('...')) which we strip.
        return bg_match.group(1).strip("'\"")
        
    return None

def create_issues_json():
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
        cover_html_path = os.path.join(issue_dir, 'cover.html')

        if not os.path.exists(manifest_path):
            print(f"Warning: manifest.xml not found for issue {i}. Skipping.")
            continue

        try:
            # --- Parse manifest.xml ---
            tree = ET.parse(manifest_path)
            root = tree.getroot()

            issue_number = root.find('issueNumber').get('value')
            publication_date = root.find('publicationDate').get('value')
            year = int(publication_date.split()[-1])

            articles_data = []
            article_names = []

            reading_views = {view.get('name'): view.get('value') for view in root.findall('.//readingView')}
            archival_articles = root.findall('.//article')

            for article in archival_articles:
                article_name = article.get('name')
                archive_url = article.get('value')
                reading_url = reading_views.get(article_name)
                
                if reading_url:
                    articles_data.append({
                        "name": article_name,
                        "readingUrl": f"issues/{i}/{reading_url}",
                        "archiveUrl": f"issues/{i}/{archive_url}"
                    })
                    article_names.append(article_name)

            issue_title = " / ".join(article_names)

            # --- Parse cover.html to find cover image ---
            cover_image_filename = None
            if os.path.exists(cover_html_path):
                with open(cover_html_path, 'r', encoding='utf-8', errors='ignore') as f:
                    html_content = f.read()
                    cover_image_filename = find_cover_image(html_content)
            
            if cover_image_filename:
                # The path in cover.html might be relative, e.g., 'images/cover.jpg'
                # We construct the full path from the web app's perspective.
                cover_url = f"issues/{i}/{cover_image_filename}"
            else:
                # Fallback if cover.html doesn't exist or has no image
                print(f"Warning: Could not find cover image in cover.html for issue {i}. Using default.")
                cover_url = f"issues/{i}/images/Cinefex-{i}-p1-img01.jpg"


            issue_data = {
                "issue": int(issue_number),
                "title": issue_title,
                "year": year,
                "coverUrl": cover_url,
                "description": f"Featuring articles on {issue_title}.",
                "articles": articles_data
            }
            all_issues_data.append(issue_data)
            print(f"Successfully processed issue {i}. Cover: {cover_image_filename or 'Not Found'}")

        except Exception as e:
            print(f"Error processing manifest for issue {i}: {e}")

    all_issues_data.sort(key=lambda x: x['issue'])

    output_path = 'issues.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_issues_data, f, indent=4)

    print(f"\nProcessing complete. Consolidated data saved to {output_path}")

if __name__ == '__main__':
    create_issues_json()
