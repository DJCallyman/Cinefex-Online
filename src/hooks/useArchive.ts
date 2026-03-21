import { useState, useEffect, useCallback } from 'react';
import { Magazine, YearBucket } from '../types';

interface ArchiveState {
    magazines: Magazine[];
    isLoading: boolean;
    error: string | null;
    buckets: YearBucket[];
}

export function useArchive() {
    const [state, setState] = useState<ArchiveState>({
        magazines: [],
        isLoading: true,
        error: null,
        buckets: [],
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/issues_full.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: Magazine[] = await response.json();

                const buckets = computeYearBuckets(data);

                setState({
                    magazines: data,
                    isLoading: false,
                    error: null,
                    buckets,
                });
            } catch (err) {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: err instanceof Error ? err.message : 'Failed to load archive data',
                }));
            }
        }

        fetchData();
    }, []);

    const search = useCallback(
        (query: string): Magazine[] => {
            const q = query.trim().toLowerCase();
            if (!q) return state.magazines;

            return state.magazines.filter((magazine) => {
                if (String(magazine.issue) === q) return true;
                if (String(magazine.year).includes(q)) return true;
                if (magazine.title.toLowerCase().includes(q)) return true;

                return magazine.articles.some((article) => {
                    if (article.name.toLowerCase().includes(q)) return true;
                    if (article.articleTitle && article.articleTitle.toLowerCase().includes(q)) return true;
                    return false;
                });
            });
        },
        [state.magazines],
    );

    const getMagazineByIssue = useCallback(
        (issueNumber: number): Magazine | undefined => {
            return state.magazines.find((m) => m.issue === issueNumber);
        },
        [state.magazines],
    );

    return {
        ...state,
        search,
        getMagazineByIssue,
    };
}

function computeYearBuckets(magazines: Magazine[]): YearBucket[] {
    const bucketMap = new Map<string, { magazines: Magazine[]; startYear: number; endYear: number }>();

    magazines.forEach((magazine) => {
        const bucketKey = getYearBucketKey(magazine.year);
        const { startYear, endYear } = getYearBucketRange(magazine.year);

        if (!bucketMap.has(bucketKey)) {
            bucketMap.set(bucketKey, { magazines: [], startYear, endYear });
        }
        bucketMap.get(bucketKey)!.magazines.push(magazine);
    });

    return Array.from(bucketMap.entries())
        .sort(([a], [b]) => {
            const startA = getYearBucketRange(parseInt(a.split('-')[0])).startYear;
            const startB = getYearBucketRange(parseInt(b.split('-')[0])).startYear;
            return startA - startB;
        })
        .map(([key, value]) => ({
            key,
            startYear: value.startYear,
            endYear: value.endYear,
            magazines: value.magazines,
        }));
}

function getYearBucketKey(year: number): string {
    const { startYear, endYear } = getYearBucketRange(year);
    return `${startYear}-${endYear}`;
}

function getYearBucketRange(year: number): { startYear: number; endYear: number } {
    const startYear = Math.floor((year - 1) / 5) * 5 + 1;
    const endYear = startYear + 4;
    return { startYear, endYear };
}
