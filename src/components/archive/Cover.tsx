import { type SyntheticEvent } from 'react';
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
 *
 * When `fallback` is set the component renders a plain <img> (no
 * <picture>/<source>) so the broken WebP source can't shadow the
 * placeholder — without this, WebP-supporting browsers ignore the
 * <img> src mutation and never show the fallback.
 */
export function Cover({ issue, className, alt, fallback, onError, loading, fetchPriority }: CoverProps) {
    const src = `/covers/${issue}/cover512.jpg`;
    const webp = `/covers/${issue}/cover512.webp`;

    const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
        onError?.();
        // If the parent supplied a placeholder, swap the src directly. We
        // only reach this branch when rendering as a plain <img> (fallback
        // set), so there's no <source> shadowing the swap.
        if (fallback) {
            const img = e.currentTarget;
            if (img.getAttribute('src') !== fallback) {
                img.src = fallback;
            }
        }
    };

    // Fallback path: render a plain <img> so a broken <source type="image/webp">
    // can't keep the placeholder from showing in WebP-supporting browsers.
    if (fallback) {
        return (
            <img
                src={fallback}
                alt={alt}
                className={className}
                width={CONFIG.COVER_SIZE}
                height={CONFIG.COVER_SIZE}
                loading={loading ?? 'lazy'}
                decoding="async"
                fetchPriority={fetchPriority}
                onError={handleError}
            />
        );
    }

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
