import { FontSize } from '../hooks/useFontSize';

const STYLE_ID = 'cinefex-fontsize';

const FONT_SIZE_PERCENT: Record<FontSize, number> = {
    small: 90,
    medium: 100,
    large: 120,
};

/**
 * Injects (or updates) a <style> override in the iframe's document head to
 * scale the article body font size. Safe to call multiple times — replaces
 * the previous override rather than appending.
 *
 * Only meaningful in reading view (archival layout is fixed-design).
 */
export function applyFontSize(iframe: HTMLIFrameElement, size: FontSize): void {
    try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const pct = FONT_SIZE_PERCENT[size];
        let el = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!el) {
            el = doc.createElement('style');
            el.id = STYLE_ID;
            doc.head.appendChild(el);
        }
        el.textContent = `body { font-size: ${pct}% !important; }`;
    } catch {
        // Cross-origin or inaccessible document — silently skip.
    }
}
