import { SkeletonCover } from './SkeletonCover';

const SKELETON_COUNT = 8;

/**
 * Skeleton placeholder for the archive grid while issue data loads.
 * Renders N ghost covers in the same responsive grid layout as ArchiveGrid.
 */
export function SkeletonGrid() {
    return (
        <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
            aria-label="Loading archive…"
            role="status"
            aria-busy="true"
        >
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <SkeletonCover key={i} />
            ))}
        </div>
    );
}
