import { useState, useEffect } from 'react';

interface WordCountsPayload {
    version: 1;
    wordCounts: Record<string, number>;
}

let cache: WordCountsPayload | null = null;
let loadPromise: Promise<WordCountsPayload | null> | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
    subscribers.forEach((cb) => cb());
}

function loadWordCounts(): Promise<WordCountsPayload | null> {
    if (loadPromise) return loadPromise;
    loadPromise = fetch('/wordcounts.json')
        .then((r) => {
            if (!r.ok) throw new Error(`wordcounts.json: ${r.status}`);
            return r.json() as Promise<WordCountsPayload>;
        })
        .then((data) => {
            cache = data;
            notifySubscribers();
            return data;
        })
        .catch(() => {
            // Not available in dev unless build:search-index has been run — fail silently.
            return null;
        });
    return loadPromise;
}

/** React hook: triggers lazy load, re-renders once data arrives. */
export function useWordCounts(): WordCountsPayload | null {
    const [data, setData] = useState<WordCountsPayload | null>(cache);

    useEffect(() => {
        if (cache) {
            setData(cache);
            return;
        }
        const cb = () => setData(cache);
        subscribers.add(cb);
        loadWordCounts();
        return () => {
            subscribers.delete(cb);
        };
    }, []);

    return data;
}

/** Returns "~N min" or null if word count unavailable. */
export function formatReadingTime(wordCounts: WordCountsPayload | null, issue: number, articleIndex: number): string | null {
    if (!wordCounts) return null;
    const count = wordCounts.wordCounts[`${issue}/${articleIndex}`];
    if (count === undefined) return null;
    const minutes = Math.max(1, Math.ceil(count / 250));
    return `~${minutes} min`;
}

