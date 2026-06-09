/**
 * Single source of truth for cleaning up an article subtitle so it can be
 * rendered below the subject without duplicating the subject.
 *
 * The publisher's iPad-team source HTML fills `<meta name="Title">` (and the
 * `<articleTitle>` element) inconsistently:
 *
 *   1. Most articles: a clean subtitle distinct from the film name in
 *      `<meta name="Film">`. Render as-is on line 2.
 *   2. "Brainstorm — Getting the Cookie at the End" with Film="Brainstorm" —
 *      the subject is duplicated as a leading prefix with a separator.
 *      Strip the leading "<subject> <separator> " and render the rest.
 *   3. "The Effects of Beetlejuice" with Film="Beetlejuice" — the subject
 *      appears mid-string, part of a longer phrase. Leave the whole string
 *      alone; stripping would leave a meaningless suffix.
 *
 * Rules (single source of truth; formerly mirrored in
 * `create_json.py:clean_article_title`, which was deleted when the Python
 * index builder was replaced with a pure-JS port in
 * `scripts/build-search-index.mjs`):
 *
 *   1. Empty / whitespace-only title → return null.
 *   2. Title equals subject (case-insensitive) → return null.
 *   3. Title starts with "<subject> <separator>..." → strip the subject
 *      and the leading separator(s).
 *   4. After stripping, trim leading/trailing whitespace and separator
 *      punctuation. If the remainder is empty or equal to the subject,
 *      return null. Otherwise return the cleaned subtitle.
 *
 * The function is pure: no DOM access, no I/O. It's imported by both the
 * React UI (`src/utils/articleDisplay.ts`) and the build-time search-index
 * generator (`scripts/build-search-index.mjs`), so the runtime search
 * snippets stay consistent with what the modal renders.
 */

const SUBJECT_SEPARATORS = ['-', '–', '—', ':', '|'] as const;
const TRIM_CHARS = ' \t\n\r,.;:–—';

function collapseWhitespace(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
}

function stripPrefix(title: string, subject: string): string {
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
        let start = 0;
        let end = s.length;
        while (start < end && TRIM_CHARS.includes(s[start])) start++;
        while (end > start && TRIM_CHARS.includes(s[end - 1])) end--;
        s = s.slice(start, end);
    } while (s !== prev);
    return s;
}

/**
 * Return a cleaned subtitle suitable for rendering below the subject, or
 * `null` when no distinct subtitle should be shown.
 *
 * @param subject The primary subject (typically the Film metadata), used
 *                both to detect a leading duplicate prefix and to detect
 *                the title-equals-subject no-op case.
 * @param title   The raw subtitle text (the Title metadata or the
 *                `<articleTitle>` element's text). Optional because the
 *                Article type defines `articleTitle?: string` and many
 *                articles in the JSON don't have one.
 */
export function cleanArticleTitle(subject: string, title?: string | null): string | null {
    if (!subject || !title) return null;
    const s = collapseWhitespace(subject);
    const t = collapseWhitespace(title);
    if (!s || !t) return null;
    if (t.toLowerCase() === s.toLowerCase()) return null;

    const cleaned = trimEnds(stripPrefix(t, s));
    const finalCleaned = collapseWhitespace(cleaned);
    if (!finalCleaned || finalCleaned.toLowerCase() === s.toLowerCase()) return null;
    return finalCleaned;
}
