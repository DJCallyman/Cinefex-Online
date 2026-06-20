/** Animated placeholder for a single magazine cover while data loads. */
export function SkeletonCover() {
    return (
        <div className="animate-pulse" aria-hidden="true">
            {/* Cover image placeholder — match the aspect-square cover ratio */}
            <div className="w-full aspect-square rounded-lg bg-gray-700/60" />
            {/* Issue number line */}
            <div className="mt-3 flex flex-col items-center gap-2">
                <div className="h-3.5 w-20 rounded bg-gray-700/60" />
                <div className="h-3 w-12 rounded bg-gray-700/40" />
            </div>
        </div>
    );
}
