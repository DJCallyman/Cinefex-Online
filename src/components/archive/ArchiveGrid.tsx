import { useArchiveContext } from '../../context/ArchiveContext';
import { MagazineCover } from './MagazineCover';

export function ArchiveGrid() {
    const { isLoading, error, buckets, filteredMagazines, searchQuery } = useArchiveContext();

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
                            No issues matching &ldquo;<strong className="text-white">{searchQuery}</strong>&rdquo; were found.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="magazine-grid">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {filteredMagazines.map((magazine) => (
                        <MagazineCover key={magazine.issue} magazine={magazine} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="magazine-grid">
            {buckets.map((bucket) => (
                <YearBucketWrapper key={bucket.key} bucket={bucket} />
            ))}
        </div>
    );
}

import { YearBucket as YearBucketType } from '../../types';

interface YearBucketWrapperProps {
    bucket: YearBucketType;
}

function YearBucketWrapper({ bucket }: YearBucketWrapperProps) {
    return (
        <section id={`bucket-${bucket.key}`} className="pt-24 -mt-24 mb-12">
            <h2 className="text-3xl font-bold mt-12 mb-6 text-cyan-400 border-b border-gray-700 pb-2">{bucket.key}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {bucket.magazines.map((magazine) => (
                    <MagazineCover key={magazine.issue} magazine={magazine} />
                ))}
            </div>
        </section>
    );
}
