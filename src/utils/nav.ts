/**
 * Build a `[prev, next]` tuple of neighbors for the given issue/article
 * within a flat list of magazines. Returns `[null, null]` when the input
 * is empty. Wraps are not used: archive browsing is linear in time.
 */

export interface IssueNeighbor {
    issue: number;
    articleIndex: number;
    articleName: string;
}

export function getArticleNeighbors(
    magazines: { issue: number; articles: { name: string }[] }[],
    currentIssue: number,
    currentArticleIndex: number,
): { prev: IssueNeighbor | null; next: IssueNeighbor | null } {
    if (magazines.length === 0) return { prev: null, next: null };

    // Build a flat list of all (issue, articleIndex) tuples in archive order
    const flat: { issue: number; articleIndex: number; name: string }[] = [];
    for (const m of magazines) {
        m.articles.forEach((a, i) => flat.push({ issue: m.issue, articleIndex: i, name: a.name }));
    }

    const idx = flat.findIndex((e) => e.issue === currentIssue && e.articleIndex === currentArticleIndex);
    if (idx === -1) return { prev: null, next: null };

    const mk = (e: (typeof flat)[number] | undefined): IssueNeighbor | null =>
        e ? { issue: e.issue, articleIndex: e.articleIndex, articleName: e.name } : null;

    return {
        prev: mk(flat[idx - 1]),
        next: mk(flat[idx + 1]),
    };
}

export function getIssueNeighbors(
    magazines: { issue: number }[],
    currentIssue: number,
): { prev: number | null; next: number | null } {
    if (magazines.length === 0) return { prev: null, next: null };
    // Preserve the archive order of `magazines` (the order the data ships
    // in from public/issues_full.json).
    // Sorting here would silently reshuffle nav on issues where the data is
    // out of numeric order.
    const issues = magazines.map((m) => m.issue);
    const idx = issues.indexOf(currentIssue);
    if (idx === -1) return { prev: null, next: null };
    return {
        prev: idx > 0 ? issues[idx - 1] : null,
        next: idx < issues.length - 1 ? issues[idx + 1] : null,
    };
}
