#!/usr/bin/env python3
"""
Script to compare article names in issues.json against the actual
title elements in the ReadingView HTML files.
"""

import json
import os
import re
from html.parser import HTMLParser


class TitleExtractor(HTMLParser):
    """HTML parser to extract content from <meta name="Title"> or <articleTitle>"""
    
    def __init__(self):
        super().__init__()
        self.in_article_title = False
        self.article_title_text = None
        self.meta_title = None
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        # Check for <meta name="Title" content="..."/>
        if tag == 'meta' and attrs_dict.get('name', '').lower() == 'title':
            self.meta_title = attrs_dict.get('content', '')
        
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
    
    def get_title(self):
        """Return the best available title, preferring meta title"""
        if self.meta_title:
            return self.meta_title.strip()
        if self.article_title_text:
            # Clean up the articleTitle text (remove extra whitespace)
            return ' '.join(self.article_title_text.split())
        return None


def extract_title_from_html(file_path):
    """Extract the title from an HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        parser = TitleExtractor()
        parser.feed(content)
        return parser.get_title()
    except Exception as e:
        return None


def normalize_title(title):
    """Normalize a title for comparison - remove common prefixes and clean up"""
    if not title:
        return ''
    
    # Remove "Special Visual Effects - " prefix if present
    title = re.sub(r'^Special Visual Effects\s*[-–—]\s*', '', title, flags=re.IGNORECASE)
    
    # Clean up whitespace and convert to lowercase
    return ' '.join(title.lower().split())


def get_article_number_from_url(url):
    """Extract the article number from a URL like 'issues/11/2.ReadingView.html'"""
    match = re.search(r'/(\d+)\.ReadingView\.html', url)
    if match:
        return int(match.group(1))
    return None


def check_article_names():
    """Compare article names in issues.json against HTML titles."""
    
    # Load issues.json
    with open('issues.json', 'r', encoding='utf-8') as f:
        issues = json.load(f)
    
    discrepancies = []
    no_title = []
    matches = 0
    total = 0
    
    for issue in issues:
        issue_num = issue['issue']
        
        for article in issue.get('articles', []):
            total += 1
            json_name = article['name']
            reading_url = article.get('readingUrl', '')
            
            # Build the file path
            if reading_url:
                file_path = reading_url  # Already relative path like 'issues/11/2.ReadingView.html'
                
                if os.path.exists(file_path):
                    html_title = extract_title_from_html(file_path)
                    
                    if html_title:
                        # Compare names (normalized)
                        json_normalized = normalize_title(json_name)
                        html_normalized = normalize_title(html_title)
                        
                        # Check if they match or if one contains the other
                        if json_normalized != html_normalized and \
                           json_normalized not in html_normalized and \
                           html_normalized not in json_normalized:
                            discrepancies.append({
                                'issue': issue_num,
                                'json_name': json_name,
                                'html_title': html_title,
                                'file': file_path
                            })
                        else:
                            matches += 1
                    else:
                        no_title.append({
                            'issue': issue_num,
                            'json_name': json_name,
                            'file': file_path
                        })
                else:
                    no_title.append({
                        'issue': issue_num,
                        'json_name': json_name,
                        'file': f'{file_path} (NOT FOUND)'
                    })
    
    # Print results
    print("=" * 70)
    print("ARTICLE NAME DISCREPANCY REPORT")
    print("=" * 70)
    print(f"\nTotal articles checked: {total}")
    print(f"Matching names: {matches}")
    print(f"Discrepancies found: {len(discrepancies)}")
    print(f"Missing title element: {len(no_title)}")
    
    if discrepancies:
        print("\n" + "-" * 70)
        print("DISCREPANCIES (JSON name vs HTML title):")
        print("-" * 70)
        for d in sorted(discrepancies, key=lambda x: x['issue']):
            print(f"\nIssue #{d['issue']}:")
            print(f"  JSON name:   \"{d['json_name']}\"")
            print(f"  HTML title:  \"{d['html_title']}\"")
            print(f"  File: {d['file']}")
    
    if no_title:
        print("\n" + "-" * 70)
        print("ARTICLES WITHOUT TITLE ELEMENT:")
        print("-" * 70)
        for item in sorted(no_title, key=lambda x: x['issue'])[:20]:  # Limit output
            print(f"  Issue #{item['issue']}: {item['json_name']}")
        if len(no_title) > 20:
            print(f"  ... and {len(no_title) - 20} more")
    
    print("\n" + "=" * 70)
    
    return discrepancies


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    check_article_names()
