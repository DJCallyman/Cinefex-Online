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

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function setScrollPositionDebounced(key: string, y: number): void {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        setScrollPosition(key, y);
        debounceTimer = null;
    }, DEBOUNCE_MS);
}
