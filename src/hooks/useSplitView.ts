import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cinefex.splitView.v1';

function readSplitView(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeSplitView(value: boolean): void {
    try {
        if (value) {
            localStorage.setItem(STORAGE_KEY, '1');
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // ignore
    }
}

/**
 * Persists the user's side-by-side split-view preference.
 * Desktop only — the UI hides the toggle below the lg breakpoint.
 */
export function useSplitView(): [boolean, () => void] {
    const [splitView, setSplitViewState] = useState<boolean>(readSplitView);

    const toggleSplitView = useCallback(() => {
        setSplitViewState((prev) => {
            const next = !prev;
            writeSplitView(next);
            return next;
        });
    }, []);

    return [splitView, toggleSplitView];
}
