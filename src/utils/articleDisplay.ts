/**
 * Defensive display helper for the article subtitle.
 *
 * The source data is cleaned at extraction time (see `create_json.py`'s
 * `clean_article_title`), but we re-normalise here so a regenerated or
 * manually-edited JSON file never renders a duplicated subject on the
 * article-list button.
 *
 * Only a *leading* "Subject <separator> …" prefix is stripped. Mid-
 * string and trailing occurrences of the subject are left alone, on
 * purpose: titles like "The Effects of Beetlejuice" or
 * "Dancing on the Edge of the Abyss" would be destroyed by stripping
 * the subject, and the 127+ issues contain many such titles.
 *
 * Returns the subtitle string to render below the subject, or `null`
 * when no distinct subtitle should be shown.
 */
const SUBJECT_SEPARATORS = ['-', '–', '—', ':', '|'] as const;
const TRIM_CHARS = ' \t\n\r,.;:–—';

function collapseWhitespace(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
}

function stripPrefix(title: string, subject: string): string {
    // Subject followed immediately by a separator at the start of the title.
    const escapedSubject = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sepClass = SUBJECT_SEPARATORS.map((c) => `\\${c}`).join('');
    const re = new RegExp(`^\\s*${escapedSubject}\\s*(?:[${sepClass}]\\s*)+`, 'i');
    return title.replace(re, '');
}

function trimEnds(s: string): string {
    let prev: string;
    do {
        prev = s;
        s = s.trim();
        // str.trim() only strips ASCII whitespace; explicitly strip the
        // punctuation/dash chars from the configured set, then re-trim.
        let start = 0;
        let end = s.length;
        while (start < end && TRIM_CHARS.includes(s[start])) start++;
        while (end > start && TRIM_CHARS.includes(s[end - 1])) end--;
        s = s.slice(start, end);
    } while (s !== prev);
    return s;
}

/**
 * Return a subtitle to render below the subject, with any leading
 * duplicated subject prefix stripped. Returns `null` when the cleaned
 * result is empty or duplicates the subject.
 */
export function displayTitle(name: string, articleTitle?: string): string | null {
    if (!name || !articleTitle) return null;
    const subject = collapseWhitespace(name);
    const title = collapseWhitespace(articleTitle);
    if (!subject || !title) return null;
    if (title.toLowerCase() === subject.toLowerCase()) return null;

    // Strip a leading "subject <separator> ..." prefix only. Mid-string
    // or trailing occurrences of the subject are left alone on purpose.
    const cleaned = trimEnds(stripPrefix(title, subject));
    const finalCleaned = collapseWhitespace(cleaned);
    if (!finalCleaned || finalCleaned.toLowerCase() === subject.toLowerCase()) return null;
    return finalCleaned;
}
