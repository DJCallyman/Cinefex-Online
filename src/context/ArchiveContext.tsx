import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Magazine, YearBucket } from '../types';

interface ArchiveContextValue {
    magazines: Magazine[];
    buckets: YearBucket[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredMagazines: Magazine[] | null;
    getMagazineByIssue: (issue: number) => Magazine | undefined;
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
        .map(([key, value]) => ({
            key,
            startYear: value.startYear,
            endYear: value.endYear,
            magazines: value.magazines,
        }));
}

export function ArchiveProvider({ children }: { children: ReactNode }) {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [buckets, setBuckets] = useState<YearBucket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/issues_full.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
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

    const filteredMagazines = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return null;

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
    }, [magazines, searchQuery]);

    const getMagazineByIssue = useCallback(
        (issue: number): Magazine | undefined => {
            return magazines.find((m) => m.issue === issue);
        },
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
            filteredMagazines,
            getMagazineByIssue,
        }),
        [magazines, buckets, isLoading, error, searchQuery, filteredMagazines, getMagazineByIssue],
    );

    return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchiveContext(): ArchiveContextValue {
    const context = useContext(ArchiveContext);
    if (!context) {
        throw new Error('useArchiveContext must be used within an ArchiveProvider');
    }
    return context;
}
