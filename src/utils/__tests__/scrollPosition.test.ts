import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    buildScrollKey,
    getScrollPosition,
    setScrollPosition,
    setScrollPositionDebounced,
    flushScrollPosition,
} from '../scrollPosition';

const STORAGE_KEY = 'cinefex.scroll.v1';

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('buildScrollKey', () => {
    it('joins issue and articleIndex with a dash', () => {
        expect(buildScrollKey(42, 3)).toBe('42-3');
    });
});

describe('setScrollPosition / getScrollPosition', () => {
    it('rounds to the nearest integer', () => {
        setScrollPosition('k', 12.7);
        expect(getScrollPosition('k')).toBe(13);
    });

    it('returns 0 for an unknown key', () => {
        expect(getScrollPosition('missing')).toBe(0);
    });

    it('survives a corrupted localStorage value', () => {
        localStorage.setItem(STORAGE_KEY, '{not json');
        expect(getScrollPosition('k')).toBe(0);
    });
});

describe('setScrollPositionDebounced', () => {
    it('does not write until the debounce window elapses', () => {
        setScrollPositionDebounced('a', 100);
        expect(getScrollPosition('a')).toBe(0);
        vi.advanceTimersByTime(499);
        expect(getScrollPosition('a')).toBe(0);
        vi.advanceTimersByTime(1);
        expect(getScrollPosition('a')).toBe(100);
    });

    it('coalesces rapid writes for the same key, keeping the latest', () => {
        setScrollPositionDebounced('a', 100);
        vi.advanceTimersByTime(200);
        setScrollPositionDebounced('a', 250);
        vi.advanceTimersByTime(200);
        setScrollPositionDebounced('a', 400);
        vi.advanceTimersByTime(500);
        expect(getScrollPosition('a')).toBe(400);
    });

    it('keeps independent keys independent — scrolling A then B does not drop A or cross-save', () => {
        // This is the core regression test for the old single-shared-timer bug:
        // scrolling article A, then within 500ms scrolling article B, must
        // persist BOTH keys' offsets (the old code dropped A's pending write).
        setScrollPositionDebounced('a', 111);
        vi.advanceTimersByTime(100); // A's timer is still pending
        setScrollPositionDebounced('b', 222);
        vi.advanceTimersByTime(100); // both timers still pending
        setScrollPositionDebounced('b', 333); // update B's pending value
        vi.advanceTimersByTime(500); // both timers fire
        expect(getScrollPosition('a')).toBe(111);
        expect(getScrollPosition('b')).toBe(333);
    });
});

describe('flushScrollPosition', () => {
    it('immediately persists a pending write without waiting for the timer', () => {
        setScrollPositionDebounced('a', 500);
        expect(getScrollPosition('a')).toBe(0);
        flushScrollPosition('a');
        expect(getScrollPosition('a')).toBe(500);
    });

    it('persists the latest queued value, not an earlier one', () => {
        setScrollPositionDebounced('a', 100);
        vi.advanceTimersByTime(100);
        setScrollPositionDebounced('a', 999);
        flushScrollPosition('a');
        expect(getScrollPosition('a')).toBe(999);
    });

    it('is a no-op when there is no pending write', () => {
        expect(() => flushScrollPosition('nope')).not.toThrow();
    });

    it('prevents a later timer fire from double-writing', () => {
        setScrollPositionDebounced('a', 700);
        flushScrollPosition('a');
        // Overwrite with a different value to prove the flushed timer is dead.
        setScrollPosition('a', 1);
        vi.advanceTimersByTime(1000);
        expect(getScrollPosition('a')).toBe(1);
    });

    it('only flushes the requested key, leaving other keys pending', () => {
        setScrollPositionDebounced('a', 10);
        setScrollPositionDebounced('b', 20);
        flushScrollPosition('a');
        expect(getScrollPosition('a')).toBe(10);
        expect(getScrollPosition('b')).toBe(0); // still pending
        vi.advanceTimersByTime(500);
        expect(getScrollPosition('b')).toBe(20);
    });
});
