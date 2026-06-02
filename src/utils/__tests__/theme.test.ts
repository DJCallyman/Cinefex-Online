import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    THEME_STORAGE_KEY,
    readStoredTheme,
    writeStoredTheme,
    resolveTheme,
    readPrefersDark,
} from '../theme';

describe('theme helpers', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('readStoredTheme returns "auto" when nothing is stored', () => {
        expect(readStoredTheme()).toBe('auto');
    });

    it('readStoredTheme returns the persisted mode', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        expect(readStoredTheme()).toBe('light');
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        expect(readStoredTheme()).toBe('dark');
        localStorage.setItem(THEME_STORAGE_KEY, 'auto');
        expect(readStoredTheme()).toBe('auto');
    });

    it('readStoredTheme ignores invalid values', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'midnight');
        expect(readStoredTheme()).toBe('auto');
    });

    it('writeStoredTheme persists the value', () => {
        writeStoredTheme('dark');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('resolveTheme forces light/dark explicit modes', () => {
        expect(resolveTheme('light', true)).toBe('light');
        expect(resolveTheme('light', false)).toBe('light');
        expect(resolveTheme('dark', true)).toBe('dark');
        expect(resolveTheme('dark', false)).toBe('dark');
    });

    it('resolveTheme follows prefersDark for auto', () => {
        expect(resolveTheme('auto', true)).toBe('dark');
        expect(resolveTheme('auto', false)).toBe('light');
    });

    it('readPrefersDark falls back to true when matchMedia is missing', () => {
        // jsdom usually does not implement matchMedia; we check the fallback
        const original = window.matchMedia;
        // @ts-expect-error: simulate a stripped-down environment
        delete (window as { matchMedia?: unknown }).matchMedia;
        expect(readPrefersDark()).toBe(true);
        if (original) window.matchMedia = original;
    });

    it('readPrefersDark reads from matchMedia when available', () => {
        window.matchMedia = vi.fn().mockImplementation((q: string) => ({
            matches: q === '(prefers-color-scheme: dark)',
            media: q,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        expect(readPrefersDark()).toBe(true);
    });
});
