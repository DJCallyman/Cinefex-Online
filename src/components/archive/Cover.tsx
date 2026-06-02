import { CONFIG } from '../../config';

interface CoverProps {
    issue: number;
    className?: string;
    alt: string;
    /** When true, the placeholder is shown even if the source 404s. */
    fallback?: string;
    onError?: () => void;
    /** Extra eager-loading. Defaults to lazy; first-bucket covers override. */
    loading?: 'lazy' | 'eager';
    fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Renders a Cinefex cover image with:
 *  - WebP source + JPEG fallback (via <picture>) for ~30% bandwidth savings
 *  - intrinsic width/height to prevent CLS
 *  - onError → caller-provided placeholder URL
 *
 * Pure presentational; the parent owns error state so it can decide
 * whether to swap to the placeholder (we just call onError).
 */
export function Cover({ issue, className, alt, fallback, onError, loading, fetchPriority }: CoverProps) {
    const src = `/covers/${issue}/cover512.jpg`;
    const webp = `/covers/${issue}/cover512.webp`;

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (fallback && img.src !== fallback) {
            img.src = fallback;
            return;
        }
        onError?.();
    };

    return (
        <picture>
            <source srcSet={webp} type="image/webp" />
            <img
                src={src}
                alt={alt}
                className={className}
                width={CONFIG.COVER_SIZE}
                height={CONFIG.COVER_SIZE}
                loading={loading ?? 'lazy'}
                decoding="async"
                fetchPriority={fetchPriority}
                onError={handleError}
            />
        </picture>
    );
}
