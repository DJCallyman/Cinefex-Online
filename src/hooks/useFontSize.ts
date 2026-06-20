import { useState, useCallback } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'cinefex.fontSize.v1';

const VALID: FontSize[] = ['small', 'medium', 'large'];

function readFontSize(): FontSize {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && (VALID as string[]).includes(stored)) return stored as FontSize;
    } catch {
        // ignore
    }
    return 'medium';
}

function writeFontSize(size: FontSize): void {
    try {
        localStorage.setItem(STORAGE_KEY, size);
    } catch {
        // ignore
    }
}

/**
 * Persists and exposes the user's preferred article font size.
 * Only meaningful in reading view — archival layout is fixed.
 */
export function useFontSize(): [FontSize, (size: FontSize) => void] {
    const [fontSize, setFontSizeState] = useState<FontSize>(readFontSize);

    const setFontSize = useCallback((size: FontSize) => {
        setFontSizeState(size);
        writeFontSize(size);
    }, []);

    return [fontSize, setFontSize];
}
