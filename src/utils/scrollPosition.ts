const STORAGE_KEY = 'cinefex.scroll.v1';
const DEBOUNCE_MS = 500;

type ScrollMap = Record<string, number>;

export function buildScrollKey(issue: number, articleIndex: number): string {
    return `${issue}-${articleIndex}`;
}

function readMap(): ScrollMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as ScrollMap) : {};
    } catch {
        return {};
    }
}

export function getScrollPosition(key: string): number {
    return readMap()[key] ?? 0;
}

export function setScrollPosition(key: string, y: number): void {
    try {
        const map = readMap();
        map[key] = Math.round(y);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // localStorage may be unavailable (private browsing quota, etc.)
    }
}

/**
 * Per-key debounce state. Each scroll key (issue-articleIndex) gets its own
 * timer so that scrolling article A and then navigating to article B within
 * the debounce window no longer drops A's pending write or saves B's offset
 * under A's key. Starting a new write for the same key cancels only that
 * key's pending write. The last queued offset is retained so it can be
 * flushed immediately on navigation/unmount.
 */
interface PendingWrite {
    timer: ReturnType<typeof setTimeout>;
    y: number;
}
const pendingWrites = new Map<string, PendingWrite>();

export function setScrollPositionDebounced(key: string, y: number): void {
    const existing = pendingWrites.get(key);
    if (existing !== undefined) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
        setScrollPosition(key, y);
        pendingWrites.delete(key);
    }, DEBOUNCE_MS);
    pendingWrites.set(key, { timer, y });
}

/**
 * Immediately persist any pending debounced write for `key` and clear its
 * timer. Call this before navigating away from an article (or on unmount)
 * so the last scroll offset isn't lost waiting for the debounce window.
 * Safe to call when there is no pending write for the key.
 */
export function flushScrollPosition(key: string): void {
    const pending = pendingWrites.get(key);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    pendingWrites.delete(key);
    setScrollPosition(key, pending.y);
}
