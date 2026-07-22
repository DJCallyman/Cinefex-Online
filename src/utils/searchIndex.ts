import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import MiniSearch, { SearchResult } from 'minisearch';

const INDEX_URL = '/search_index.json';

/**
 * Document shape produced by `scripts/build-search-index.mjs` and consumed
 * by the client to build an in-memory MiniSearch index.
 */
export interface IndexedDocument {
    id: string;                    // "<issue>/<articleIndex>"
    issue: number;
    articleIndex: number;
    name: string;                  // Film/subject
    articleTitle: string;          // article sub-title (may be empty)
    year: number;
    text: string;                  // body text (truncated to 24 kB on disk)
}

export interface SearchIndexPayload {
    version: number;
    generatedAt: string;
    documentCount: number;
    maxCharsPerDoc: number;
    documents: IndexedDocument[];
}

export interface FullTextHit {
    issue: number;
    articleIndex: number;
    score: number;
    matchedTerms: string[];
    snippet: string; // ~120 chars around first match
}

const SNIPPET_RADIUS = 60;

/**
 * Find the first occurrence of any of the given terms in `text` and
 * return a ~120-char snippet around it. Case-insensitive. Falls back to
 * the start of the text when no term appears.
 */
export function extractSnippet(text: string, matchedTerms: readonly string[]): string {
    if (!text) return '';
    if (!matchedTerms || matchedTerms.length === 0) {
        return text.slice(0, SNIPPET_RADIUS * 2).trim();
    }

    const lower = text.toLowerCase();
    let firstPos = -1;
    let firstTerm = '';
    for (const term of matchedTerms) {
        const t = term.toLowerCase();
        if (!t) continue;
        const idx = lower.indexOf(t);
        if (idx !== -1 && (firstPos === -1 || idx < firstPos)) {
            firstPos = idx;
            firstTerm = t;
        }
    }

    if (firstPos < 0 || !firstTerm) {
        return text.slice(0, SNIPPET_RADIUS * 2).trim();
    }

    const start = Math.max(0, firstPos - SNIPPET_RADIUS);
    const end = Math.min(text.length, firstPos + firstTerm.length + SNIPPET_RADIUS);
    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
}

export interface UseSearchIndexResult {
    /** True while the index JSON is loading or being parsed. */
    isLoading: boolean;
    /** Run a full-text search; empty query returns []. */
    search: (query: string) => FullTextHit[];
    /** Total documents available in the loaded index. */
    documentCount: number;
}

/**
 * Lazy-load /search_index.json and build an in-memory MiniSearch. The fetch
 * is started on first call to the hook (component mount). After the first
 * load the index is reused across remounts within the same session.
 */

let cachedIndex: MiniSearch<IndexedDocument> | null = null;
let cachedPayload: SearchIndexPayload | null = null;
let loadPromise: Promise<SearchIndexPayload | null> | null = null;

function isValidPayload(value: unknown): value is SearchIndexPayload {
    if (!value || typeof value !== 'object') return false;
    const v = value as Partial<SearchIndexPayload>;
    return (
        v.version === 1 &&
        Array.isArray(v.documents) &&
        typeof v.documentCount === 'number' &&
        typeof v.maxCharsPerDoc === 'number'
    );
}

async function loadIndexPayload(): Promise<SearchIndexPayload | null> {
    if (cachedPayload) return cachedPayload;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        try {
            const res = await fetch(INDEX_URL);
            if (!res.ok) {
                // 404 during dev (no build step) is expected — fall back to
                // metadata-only search by leaving cachedPayload null.
                if (res.status === 404) return null;
                throw new Error(`HTTP ${res.status} loading search index`);
            }
            const raw = (await res.json()) as unknown;
            if (!isValidPayload(raw)) {
                // Wrong shape — most likely a fetch mock is intercepting
                // /search_index.json in tests. Treat as "no index".
                console.warn('[cinefex] search index has unexpected shape; using metadata-only search');
                return null;
            }
            cachedPayload = raw;
            return raw;
        } catch (err) {
            // Surface to console for visibility but don't throw — the rest
            // of the app continues to work with metadata-only search.
            console.warn('[cinefex] search index unavailable:', err);
            return null;
        } finally {
            // If the load did not produce a usable payload, clear the cached
            // promise so a later mount can retry instead of reusing a
            // resolved-to-null promise forever (which silently killed search
            // for the rest of the session after a single transient failure).
            if (!cachedPayload) {
                loadPromise = null;
            }
        }
    })();

    return loadPromise;
}

function buildMiniSearch(payload: SearchIndexPayload): MiniSearch<IndexedDocument> {
    const ms = new MiniSearch<IndexedDocument>({
        idField: 'id',
        fields: ['name', 'articleTitle', 'text'],
        storeFields: ['issue', 'articleIndex', 'name', 'articleTitle', 'text'],
        searchOptions: {
            boost: { articleTitle: 2, name: 1.5 },
            prefix: true,
            fuzzy: 0.2,
            combineWith: 'AND',
        },
    });
    ms.addAll(payload.documents);
    return ms;
}

export function useSearchIndex(): UseSearchIndexResult {
    const [isLoading, setIsLoading] = useState<boolean>(cachedPayload === null && loadPromise === null);
    const [documentCount, setDocumentCount] = useState<number>(cachedPayload?.documentCount ?? 0);
    const msRef = useRef<MiniSearch<IndexedDocument> | null>(cachedIndex);

    useEffect(() => {
        if (msRef.current) {
            setIsLoading(false);
            setDocumentCount(cachedPayload?.documentCount ?? 0);
            return;
        }
        let cancelled = false;
        (async () => {
            const payload = await loadIndexPayload();
            if (cancelled) return;
            if (payload) {
                msRef.current = buildMiniSearch(payload);
                cachedIndex = msRef.current;
                setDocumentCount(payload.documentCount);
                setIsLoading(false);
            } else {
                // No index available (dev / 404) — keep isLoading false so the
                // UI doesn't show a spinner forever; search() will just return [].
                setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const search = useCallback((query: string): FullTextHit[] => {
        const q = query.trim();
        if (!q) return [];
        const ms = msRef.current;
        if (!ms) return [];

        const results: SearchResult[] = ms.search(q);
        return results.slice(0, 200).map((r) => {
            const doc = ms.getStoredFields(r.id) as IndexedDocument | undefined;
            const snippet = extractSnippet(doc?.text ?? '', r.terms);
            return {
                issue: doc?.issue ?? 0,
                articleIndex: doc?.articleIndex ?? 0,
                score: r.score,
                matchedTerms: r.terms,
                snippet,
            };
        });
    }, []);

    return useMemo(
        () => ({ isLoading, search, documentCount }),
        [isLoading, search, documentCount],
    );
}
