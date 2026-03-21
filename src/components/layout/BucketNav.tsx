import { YearBucket } from '../../types';

interface BucketNavProps {
    buckets: YearBucket[];
}

export function BucketNav({ buckets }: BucketNavProps) {
    if (buckets.length === 0) return null;

    return (
        <nav id="bucket-nav" className="mt-6" aria-label="Browse by year">
            <div className="flex flex-wrap justify-center gap-2">
                {buckets.map((bucket) => (
                    <a
                        key={bucket.key}
                        href={`#bucket-${bucket.key}`}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-semibold hover:bg-cyan-500 hover:text-white transition-colors"
                        aria-label={`Browse issues from ${bucket.startYear} to ${bucket.endYear}`}
                    >
                        {bucket.key}
                    </a>
                ))}
            </div>
        </nav>
    );
}
