import { useCallback, useEffect, useState } from 'react';
import {
    ThemeMode,
    readStoredTheme,
    writeStoredTheme,
    resolveTheme,
    readPrefersDark,
} from '../utils/theme';

/**
 * useTheme — single source of truth for the active theme.
 *
 * - mode: what the user picked (light/dark/auto). Persisted in localStorage.
 * - resolved: the actual palette currently in effect (light or dark). For
 *   'auto' this is the OS preference.
 *
 * The `<html>` element gets `data-theme="light"` or `data-theme="dark"` set
 * to drive the CSS variables defined in styles.css.
 */
export function useTheme() {
    const [mode, setModeState] = useState<ThemeMode>(() => readStoredTheme());
    const [prefersDark, setPrefersDark] = useState<boolean>(() => readPrefersDark());

    // Track OS-level changes while in 'auto' mode
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => setPrefersDark(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const resolved = resolveTheme(mode, prefersDark);

    // Apply data-theme attribute to <html> whenever the resolved theme changes.
    // We do this with an effect so the document attribute stays in sync with
    // the hook state even if the hook is re-mounted under StrictMode.
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.setAttribute('data-theme', resolved);
    }, [resolved]);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        writeStoredTheme(next);
    }, []);

    const cycle = useCallback(() => {
        setModeState((prev) => {
            const next: ThemeMode = prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light';
            writeStoredTheme(next);
            return next;
        });
    }, []);

    return { mode, resolved, setMode, cycle };
}
