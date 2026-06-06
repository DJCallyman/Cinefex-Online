import { YearBucket } from '../../types';

interface BucketNavProps {
    buckets: YearBucket[];
}

export function BucketNav({ buckets }: BucketNavProps) {
    if (buckets.length === 0) return null;

    const scrollToBucket = (bucketKey: string) => {
        const element = document.getElementById(`bucket-${bucketKey}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav id="bucket-nav" className="mt-6" aria-label="Browse by year">
            <div className="flex flex-wrap justify-center gap-2">
                {buckets.map((bucket) => (
                    <button
                        key={bucket.key}
                        onClick={() => scrollToBucket(bucket.key)}
                        className="inline-flex items-center px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-semibold hover:bg-cyan-500 hover:text-white transition-colors cursor-pointer"
                        aria-label={`Browse issues from ${bucket.startYear} to ${bucket.endYear}`}
                    >
                        {bucket.key}
                    </button>
                ))}
            </div>
        </nav>
    );
}
