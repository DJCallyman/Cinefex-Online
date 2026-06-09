import { useEffect, useRef } from 'react';

/**
 * Global keyboard shortcuts:
 *   /         focus the search bar
 *   g g       "go to bucket": focus the first bucket-nav button so a second
 *             letter picks a year range (a la Gmail)
 *
 * Arrow-key navigation on the cover grid is implemented inside ArchiveGrid
 * because it needs Roving-tabindex state; we don't try to multiplex that here.
 */
export function useGlobalShortcuts() {
    const lastGRef = useRef<number>(0);

    useEffect(() => {
        const isEditableTarget = (target: EventTarget | null): boolean => {
            if (!(target instanceof HTMLElement)) return false;
            const tag = target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
            if (target.isContentEditable) return true;
            return false;
        };

        const handler = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target)) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            // "/" focuses search (but "/" inside an input is ignored above)
            if (e.key === '/') {
                e.preventDefault();
                const search = document.getElementById('search-input') as HTMLInputElement | null;
                if (search) {
                    search.focus();
                    search.select();
                }
                return;
            }

            // "g g" within 800ms focuses the bucket nav
            if (e.key === 'g' || e.key === 'G') {
                const now = Date.now();
                if (now - lastGRef.current < 800) {
                    e.preventDefault();
                    lastGRef.current = 0;
                    const firstBucket = document.querySelector<HTMLElement>('#bucket-nav button');
                    if (firstBucket) firstBucket.focus();
                } else {
                    lastGRef.current = now;
                }
                return;
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);
}
