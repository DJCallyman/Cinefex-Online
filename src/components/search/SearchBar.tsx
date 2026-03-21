import { useState, useCallback, useEffect, useRef } from 'react';
import { useArchiveContext } from '../../context/ArchiveContext';

export function SearchBar() {
    const { searchQuery, setSearchQuery } = useArchiveContext();
    const [inputValue, setInputValue] = useState(searchQuery);
    const [showClear, setShowClear] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setInputValue(searchQuery);
        setShowClear(!!searchQuery);
    }, [searchQuery]);

    const handleInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);
            setShowClear(!!value);

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                setSearchQuery(value);
            }, 300);
        },
        [setSearchQuery],
    );

    const handleClear = useCallback(() => {
        setInputValue('');
        setShowClear(false);
        setSearchQuery('');
    }, [setSearchQuery]);

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
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return (
        <>
            <input
                id="search-input"
                type="search"
                value={inputValue}
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
