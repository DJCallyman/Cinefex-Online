import { useState, useCallback, useEffect, useRef } from 'react';
import { useArchiveContext } from '../../context/ArchiveContext';
import { CONFIG } from '../../config';
import { SearchMode } from '../../context/ArchiveContext';

export function SearchBar() {
    const {
        searchQuery,
        setSearchQuery,
        searchMode,
        setSearchMode,
        isSearchIndexLoading,
        isSearchIndexReady,
        fullTextHits,
        filteredMagazines,
    } = useArchiveContext();
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
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => setSearchQuery(value), CONFIG.DEBOUNCE_MS);
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

    const handleModeChange = useCallback(
        (mode: SearchMode) => {
            setSearchMode(mode);
            // Re-apply the current input value to the search query so the
            // new mode's filter runs immediately, without waiting for the
            // next keystroke.
            setSearchQuery(inputValue);
        },
        [setSearchMode, setSearchQuery, inputValue],
    );

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // Placeholder copy differs by mode to set the right expectation.
    const placeholder =
        searchMode === 'title'
            ? 'Search by film, issue number, or year…'
            : 'Search inside article text…';

    // Status pill below the input.
    const showStatus = inputValue.trim() || (searchMode === 'fulltext' && isSearchIndexLoading);
    const statusText = (() => {
        if (searchMode === 'title' && inputValue.trim()) {
            const n = filteredMagazines?.length ?? 0;
            return n === 0 ? 'No matching issues' : `${n} matching ${n === 1 ? 'issue' : 'issues'}`;
        }
        if (searchMode === 'fulltext' && isSearchIndexLoading) return 'Loading article index…';
        if (inputValue.trim() && searchMode === 'fulltext') {
            if (!isSearchIndexReady) {
                return 'Index unavailable — check the build output.';
            }
            const n = fullTextHits.length;
            return n === 0
                ? 'No matches in article text'
                : `${n} match${n === 1 ? '' : 'es'} in article text`;
        }
        return '';
    })();

    return (
        <>
            {/* Mode toggle: two pill buttons side-by-side above the input */}
            <div
                role="tablist"
                aria-label="Search mode"
                className="flex justify-center gap-1 mb-2"
            >
                <ModePill
                    active={searchMode === 'title'}
                    onClick={() => handleModeChange('title')}
                    label="Title / film"
                />
                <ModePill
                    active={searchMode === 'fulltext'}
                    onClick={() => handleModeChange('fulltext')}
                    label="Full text"
                />
            </div>

            <input
                id="search-input"
                type="search"
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                aria-label="Search the archive"
                data-search-mode={searchMode}
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
            {showStatus && statusText && (
                <p
                    className="mt-2 text-xs text-gray-400"
                    role="status"
                    aria-live="polite"
                    data-testid="search-status"
                >
                    {statusText}
                </p>
            )}
        </>
    );
}

function ModePill({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={
                'px-3 py-1 text-xs font-semibold rounded-full transition-colors ' +
                (active
                    ? 'bg-cyan-500 text-gray-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700')
            }
        >
            {label}
        </button>
    );
}
