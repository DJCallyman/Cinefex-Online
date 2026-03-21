import { useState, useCallback, useEffect, useRef } from 'react';

export function SearchBar() {
    const [query, setQuery] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('q') ?? '';
    });
    const [showClear, setShowClear] = useState(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlQuery = params.get('q') ?? '';
        if (urlQuery !== query) {
            setQuery(urlQuery);
            setShowClear(!!urlQuery);
        }
    }, [window.location.search]);

    const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setShowClear(!!value);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            if (value.trim()) {
                const url = new URL(window.location.href);
                url.searchParams.set('q', value);
                window.history.replaceState(null, '', url.pathname + url.search);
            } else {
                const url = new URL(window.location.href);
                url.searchParams.delete('q');
                window.history.replaceState(null, '', url.pathname + url.search);
            }
        }, 300);
    }, []);

    const handleClear = useCallback(() => {
        setQuery('');
        setShowClear(false);
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        window.history.replaceState(null, '', url.pathname + url.search);
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClear();
                (e.target as HTMLInputElement).blur();
            }
        },
        [handleClear],
    );

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <>
            <input
                id="search-input"
                type="search"
                value={query}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Search by film, issue number, or year..."
                className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                aria-label="Search the archive"
            />
            <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
            {showClear && (
                <button
                    id="search-clear"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label="Clear search"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </>
    );
}
