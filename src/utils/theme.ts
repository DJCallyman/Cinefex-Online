export type ThemeMode = 'light' | 'dark' | 'auto';

export const THEME_STORAGE_KEY = 'cinefexThemeMode';

/**
 * Read the persisted theme from localStorage, falling back to 'auto'
 * when nothing is stored or storage is unavailable.
 */
export function readStoredTheme(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'auto';
    try {
        const v = localStorage.getItem(THEME_STORAGE_KEY);
        if (v === 'light' || v === 'dark' || v === 'auto') return v;
    } catch {
        // localStorage may throw in private mode / sandboxed contexts
    }
    return 'auto';
}

export function writeStoredTheme(mode: ThemeMode): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
        // ignore
    }
}

/**
 * Resolve a ThemeMode to the concrete palette the user actually sees.
 * - 'light' → 'light'
 * - 'dark' → 'dark'
 * - 'auto' → 'light' or 'dark' based on the OS prefers-color-scheme media query
 */
export function resolveTheme(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark' {
    if (mode === 'light' || mode === 'dark') return mode;
    return prefersDark ? 'dark' : 'light';
}

/**
 * Determine the user's dark/light preference from the OS.
 * Safe to call in non-browser environments; defaults to dark.
 */
export function readPrefersDark(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
