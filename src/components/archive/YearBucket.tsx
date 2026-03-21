import { YearBucket as YearBucketType } from '../../types';
import { MagazineCover } from './MagazineCover';

interface YearBucketProps {
    bucket: YearBucketType;
    isSearchResult?: boolean;
}

export function YearBucket({ bucket, isSearchResult = false }: YearBucketProps) {
    if (isSearchResult) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mb-12">
                {bucket.magazines.map((magazine) => (
                    <MagazineCover key={magazine.issue} magazine={magazine} />
                ))}
            </div>
        );
    }

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
