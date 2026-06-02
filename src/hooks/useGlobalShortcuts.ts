import { useEffect, useRef } from 'react';
import { useArchiveContext } from '../context/ArchiveContext';
import { useNavigate } from 'react-router-dom';

interface Options {
    /**
     * Return true if a global shortcut should be ignored because the user is
     * typing into a form field. We don't want `/` to launch search while
     * the user is typing into the search bar.
     */
    isEditableTarget: (target: EventTarget | null) => boolean;
}

const DEFAULT_OPTIONS: Options = {
    isEditableTarget: (target) => {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (target.isContentEditable) return true;
        return false;
    },
};

/**
 * Global keyboard shortcuts:
 *   /         focus the search bar
 *   g g       "go to bucket": focus the first bucket-nav button so a second
 *             letter picks a year range (a la Gmail)
 *   ?         show shortcut hints (placeholder; opens a help dialog in future)
 *
 * Arrow-key navigation on the cover grid is implemented inside ArchiveGrid
 * because it needs Roving-tabindex state; we don't try to multiplex that here.
 */
export function useGlobalShortcuts(options: Partial<Options> = {}) {
    const navigate = useNavigate();
    const { buckets } = useArchiveContext();
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lastGRef = useRef<number>(0);

    useEffect(() => {
        const isEditable = opts.isEditableTarget;
        const handler = (e: KeyboardEvent) => {
            if (isEditable(e.target)) return;
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
    }, [opts.isEditableTarget, navigate, buckets]);
}
