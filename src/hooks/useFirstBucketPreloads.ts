import { useEffect } from 'react';
import { useArchiveContext } from '../context/ArchiveContext';

/**
 * Inject <link rel="preload" as="image"> tags for the first `count` covers
 * in archive order, so they begin downloading in parallel with the JS hydration.
 *
 * Browsers also handle native <img loading="eager"> + fetchpriority="high" for
 * the actual <Cover> elements that render in-viewport, but the preload tag
 * starts the network request even earlier (before the React tree is committed).
 */
const DEFAULT_COUNT = 8;

export function useFirstBucketPreloads(count: number = DEFAULT_COUNT) {
    const { magazines, isLoading } = useArchiveContext();

    useEffect(() => {
        if (isLoading || magazines.length === 0) return;
        if (typeof document === 'undefined') return;

        const targets = magazines.slice(0, count);
        const fragment = document.createDocumentFragment();

        for (const m of targets) {
            // Preload the WebP first (preferred for ~all modern browsers), then
            // the JPEG fallback. Modern browsers will dedupe to whichever they use.
            for (const [href, type] of [
                [`/covers/${m.issue}/cover512.webp`, 'image/webp'],
                [`/covers/${m.issue}/cover512.jpg`, 'image/jpeg'],
            ]) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = href;
                link.type = type;
                link.setAttribute('fetchpriority', 'high');
                link.setAttribute('data-cinefex-preload', String(m.issue));
                fragment.appendChild(link);
            }
        }

        document.head.appendChild(fragment);

        return () => {
            // Clean up the preloads when the component unmounts (e.g. SPA unmount)
            document
                .querySelectorAll('link[data-cinefex-preload]')
                .forEach((el) => el.parentNode?.removeChild(el));
        };
    }, [isLoading, magazines, count]);
}
