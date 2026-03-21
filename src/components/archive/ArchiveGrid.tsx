import { useState, useEffect } from 'react';
import { Magazine } from '../../types';
import { useArchive } from '../../hooks';
import { YearBucket } from './YearBucket';

export function ArchiveGrid() {
    const { isLoading, error, buckets, search } = useArchive();
    const [filteredMagazines, setFilteredMagazines] = useState<Magazine[] | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q') ?? '';
        if (q) {
            setQuery(q);
            setFilteredMagazines(search(q));
        } else {
            setFilteredMagazines(null);
            setQuery('');
        }
    }, [search]);

    if (isLoading) {
        return (
            <p
                id="loading-indicator"
                className="text-center col-span-full text-gray-300"
                role="status"
                aria-live="polite"
            >
                Loading archive...
            </p>
        );
    }

    if (error) {
        return <p className="text-center text-red-400 col-span-full py-16">{error}</p>;
    }

    if (filteredMagazines !== null) {
        if (filteredMagazines.length === 0) {
            return (
                <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="magazine-grid">
                    <div className="col-span-full text-center py-16">
                        <p className="text-2xl text-gray-300 mb-2">No results found</p>
                        <p className="text-gray-400">
                            No issues matching "<strong className="text-white">{query}</strong>" were found.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="magazine-grid">
                {filteredMagazines.map((magazine) => (
                    <YearBucket
                        key={`search-${magazine.issue}`}
                        bucket={{
                            key: `search-${magazine.issue}`,
                            startYear: magazine.year,
                            endYear: magazine.year,
                            magazines: [magazine],
                        }}
                        isSearchResult
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="magazine-grid">
            {buckets.map((bucket) => (
                <YearBucket key={bucket.key} bucket={bucket} />
            ))}
        </div>
    );
}
