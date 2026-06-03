import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Magazine, YearBucket } from '../types';
import { CONFIG } from '../config';
import { useSearchIndex, FullTextHit } from '../utils/searchIndex';

export type SearchMode = 'title' | 'fulltext';

interface ArchiveContextValue {
    magazines: Magazine[];
    buckets: YearBucket[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    /**
     * Which search mode the user has selected. Title mode is the default
     * (fast, no index fetch, metadata-only). Full-text mode searches article
     * body content via the pre-built search index.
     */
    searchMode: SearchMode;
    setSearchMode: (mode: SearchMode) => void;
    /** Issues that pass the active-mode filter, or null if no query. */
    filteredMagazines: Magazine[] | null;
    /** Full-text hits for the current query (empty array when not in fulltext mode or no query). */
    fullTextHits: FullTextHit[];
    /** True while the search index JSON is being fetched/built. Only relevant in fulltext mode. */
    isSearchIndexLoading: boolean;
    /** True once the search index has loaded (or definitively failed). */
    isSearchIndexReady: boolean;
    getMagazineByIssue: (issue: number) => Magazine | undefined;
    selectedIssue: number | null;
    setSelectedIssue: (issue: number | null) => void;
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

function computeYearBuckets(magazines: Magazine[]): YearBucket[] {
    const bucketMap = new Map<string, { magazines: Magazine[]; startYear: number; endYear: number }>();
    magazines.forEach((magazine) => {
        const startYear = Math.floor((magazine.year - 1) / 5) * 5 + 1;
        const endYear = startYear + 4;
        const bucketKey = `${startYear}-${endYear}`;
        if (!bucketMap.has(bucketKey)) {
            bucketMap.set(bucketKey, { magazines: [], startYear, endYear });
        }
        bucketMap.get(bucketKey)!.magazines.push(magazine);
    });
    return Array.from(bucketMap.entries())
        .sort(([a], [b]) => {
            const startA = parseInt(a.split('-')[0]);
            const startB = parseInt(b.split('-')[0]);
            return startA - startB;
        })
        .map(([key, value]) => ({ key, startYear: value.startYear, endYear: value.endYear, magazines: value.magazines }));
}

export function ArchiveProvider({ children }: { children: ReactNode }) {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [buckets, setBuckets] = useState<YearBucket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState<SearchMode>('title');
    const [selectedIssue, setSelectedIssue] = useState<number | null>(null);

    // The search index is only needed in fulltext mode. The hook unconditionally
    // starts loading; we just gate the actual search() call on searchMode.
    // To avoid fetching the index until the user opts in, we only mount the
    // hook in a wrapper component below.
    const fulltextContext = useFullTextSearch(searchMode === 'fulltext');

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(CONFIG.DATA_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data: Magazine[] = await response.json();
                setMagazines(data);
                setBuckets(computeYearBuckets(data));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load archive data');
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);


    // Full-text hits — only computed when in fulltext mode AND the index is ready.
    // We depend only on the `search` function (not the whole fulltextContext
    // object) to avoid re-running on every parent re-render.
    const fulltextSearch = fulltextContext.search;
    const fullTextHits: FullTextHit[] = useMemo(() => {
        if (searchMode !== 'fulltext') return [];
        const q = searchQuery.trim();
        if (!q) return [];
        return fulltextSearch(q);
    }, [searchQuery, searchMode, fulltextSearch]);

    // Title mode filter — strictly metadata-only (issue, year, title, article name, articleTitle).
    // Does NOT consult fullTextHits or the index. This is the unchanged behavior from before
    // the full-text feature was added.
    const filteredMagazines = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return null;

        if (searchMode === 'fulltext') {
            // In fulltext mode, show only the issues that have at least one body-text hit.
            // (Metadata hits are not surfaced in this mode — keep the two modes cleanly
            // separated so the user always knows what they're searching.)
            const fullTextIssueNumbers = new Set(fullTextHits.map((h) => h.issue));
            if (fullTextIssueNumbers.size === 0) return [];
            return magazines.filter((m) => fullTextIssueNumbers.has(m.issue));
        }

        // Title mode: original substring filter
        return magazines.filter((magazine) => {
            if (String(magazine.issue) === q) return true;
            if (String(magazine.year).includes(q)) return true;
            if (magazine.title.toLowerCase().includes(q)) return true;
            return magazine.articles.some((article) => {
                if (article.name.toLowerCase().includes(q)) return true;
                if (article.articleTitle && article.articleTitle.toLowerCase().includes(q)) return true;
                return false;
            });
        });
    }, [magazines, searchQuery, searchMode, fullTextHits]);

    const getMagazineByIssue = useCallback(
        (issue: number): Magazine | undefined => magazines.find((m) => m.issue === issue),
        [magazines],
    );

    const value = useMemo(
        () => ({
            magazines,
            buckets,
            isLoading,
            error,
            searchQuery,
            setSearchQuery,
            searchMode,
            setSearchMode,
            filteredMagazines,
            fullTextHits,
            isSearchIndexLoading: fulltextContext.isLoading,
            isSearchIndexReady: fulltextContext.documentCount > 0,
            getMagazineByIssue,
            selectedIssue,
            setSelectedIssue,
        }),
        [magazines, buckets, isLoading, error, searchQuery, searchMode, filteredMagazines, fullTextHits, fulltextContext.isLoading, fulltextContext.documentCount, getMagazineByIssue, selectedIssue],
    );

    return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

/**
 * Wrapper that mounts the full-text search index only when `enabled` is
 * true. In title mode (the default) the index is never fetched, so
 * the wire payload stays at zero until the user opts in.
 */
function useFullTextSearch(enabled: boolean) {
    // When disabled, return a no-op stand-in that never loads.
    const noop = useMemo(
        () => ({ isLoading: false, documentCount: 0, search: () => [] as FullTextHit[] }),
        [],
    );
    const real = useSearchIndex();
    return enabled ? real : noop;
}

export function useArchiveContext(): ArchiveContextValue {
    const context = useContext(ArchiveContext);
    if (!context) throw new Error('useArchiveContext must be used within an ArchiveProvider');
    return context;
}
