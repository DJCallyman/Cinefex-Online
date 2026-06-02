/**
 * Escape a string for safe insertion into an HTML string. The output is
 * a string of HTML entities suitable for use in dangerouslySetInnerHTML.
 */
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Wraps every case-insensitive occurrence of `query` in `text` with
 * <mark>...</mark> tags. Returns a string safe to use in
 * dangerouslySetInnerHTML. Whitespace is preserved verbatim.
 *
 * Returns the escaped text unchanged when query is empty/whitespace.
 * Returns empty string when text is empty.
 *
 * The original (un-escaped) text is searched, then each non-match segment
 * is HTML-escaped. This way a query like "a" doesn't accidentally match
 * the literal 'a' inside an existing '&amp;' entity and corrupt the
 * surrounding entity reference.
 */
export function highlight(text: string, query: string): string {
    if (!text) return '';
    const q = query.trim();
    if (!q) return escapeHtml(text);

    // Escape regex metacharacters in the query so it matches literally
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        // Append the non-match prefix (escaped), then the match (escaped so
        // e.g. a literal & in the query result is safe)
        result += escapeHtml(text.slice(lastIndex, match.index));
        result += `<mark>${escapeHtml(match[0])}</mark>`;
        lastIndex = match.index + match[0].length;
        // Defend against zero-length matches (shouldn't happen with a non-empty
        // non-zero query, but be safe)
        if (match[0].length === 0) re.lastIndex++;
    }
    result += escapeHtml(text.slice(lastIndex));
    return result;
}
