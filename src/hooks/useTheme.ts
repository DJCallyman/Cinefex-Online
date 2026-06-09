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

    // Persist + apply to <html> as a single effect so the side effect runs
    // exactly once per resolved change, regardless of whether the user
    // clicked a button or the OS preference shifted. Doing both in an
    // effect (not inside the setState updater) keeps the side effect safe
    // under React 19 concurrent re-invocations of the updater function.
    useEffect(() => {
        writeStoredTheme(mode);
    }, [mode]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.setAttribute('data-theme', resolved);
    }, [resolved]);

    const cycle = useCallback(() => {
        setModeState((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light'));
    }, []);

    return { mode, resolved, cycle };
}
