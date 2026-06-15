import { VIDEO_MODAL_CSS } from './iframeStyles';

const NS_VIDEO_RE = /^ns:\/\/Video\/(.+)$/i;
const ENHANCED_FLAG = '__cinefexVideoEnhanced';
const GALLERY_BUTTON_CLASSES = [
    'new_button-left',
    'new_button-top',
    'new_button-top-2',
    'button-left',
    'button-left-2',
    'button-top',
    'button-top-2',
];

function isNsVideoHref(href: string): RegExpMatchArray | null {
    return href.match(NS_VIDEO_RE);
}

function videoUrlFromFilename(filename: string): string {
    return `videos/${filename}`;
}

function injectModalStyles(doc: Document): void {
    if (doc.getElementById('cinefex-video-modal-styles')) return;

    const style = doc.createElement('style');
    style.id = 'cinefex-video-modal-styles';
    style.textContent = VIDEO_MODAL_CSS;
    doc.head.appendChild(style);
}

function createCloseButton(doc: Document, onClick: () => void): HTMLButtonElement {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'cinefex-video-modal__close';
    btn.setAttribute('aria-label', 'Close video');
    btn.textContent = '\u00D7';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
    });
    return btn;
}

function createVideoElement(doc: Document, url: string): HTMLVideoElement {
    const video = doc.createElement('video');
    video.className = 'cinefex-video-modal__video';
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    // Let clicks on the video controls pass through to the native element.
    video.addEventListener('click', (e) => e.stopPropagation());
    return video;
}

function openVideoModal(doc: Document, url: string): void {
    let modal = doc.querySelector('.cinefex-video-modal');
    if (modal) {
        modal.remove();
    }

    modal = doc.createElement('div');
    modal.className = 'cinefex-video-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Video player');

    const video = createVideoElement(doc, url);
    modal.appendChild(video);

    const close = createCloseButton(doc, () => modal?.remove());
    modal.appendChild(close);

    const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            modal?.remove();
            doc.removeEventListener('keydown', handleKey);
        }
    };
    doc.addEventListener('keydown', handleKey);

    modal.addEventListener('click', () => {
        modal?.remove();
        doc.removeEventListener('keydown', handleKey);
    });

    doc.body.appendChild(modal);
}

function bindVideoAnchor(a: HTMLAnchorElement): void {
    const href = a.getAttribute('href') || '';
    const match = isNsVideoHref(href);
    if (!match) return;

    const filename = match[1];
    if (!filename) return;

    const url = videoUrlFromFilename(filename);
    a.setAttribute('href', url);
    a.classList.add('cinefex-video-button');
    a.style.cursor = 'pointer';

    // Reveal the parent gallery button block so the video icon is visible,
    // while non-video siblings stay hidden via combinedArchival.css.
    const wrapper = a.closest(GALLERY_BUTTON_CLASSES.map((c) => `.${c}`).join(', '));
    if (wrapper) {
        wrapper.classList.add('has-cinefex-video');
    }

    a.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openVideoModal(a.ownerDocument, url);
    });
}

function bindVideoArea(area: HTMLAreaElement): void {
    const href = area.getAttribute('href') || '';
    const match = isNsVideoHref(href);
    if (!match) return;

    const filename = match[1];
    if (!filename) return;

    const url = videoUrlFromFilename(filename);
    area.setAttribute('href', url);
    area.style.cursor = 'pointer';
    area.setAttribute('title', 'Play video');
    area.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openVideoModal(area.ownerDocument, url);
    });
}

/**
 * Rewrite `ns://Video/...` links in a 127+ archival/manuscript iframe so they
 * play in a lightweight in-iframe video modal instead of doing nothing.
 *
 * Affected elements:
 *   - Manuscript <area> image-map hot zones (e.g. first-page play buttons).
 *   - Gallery .new_button-* / .button-* <a> links that point at ns://Video.
 *
 * Idempotent: repeated calls for the same document are no-ops.
 */
export function enhanceVideoLinks(doc: Document): void {
    if ((doc as unknown as Record<string, boolean>)[ENHANCED_FLAG]) return;
    (doc as unknown as Record<string, boolean>)[ENHANCED_FLAG] = true;

    injectModalStyles(doc);

    // Manuscript page image-map hot zones.
    for (const area of Array.from(doc.querySelectorAll('area[href]'))) {
        bindVideoArea(area as HTMLAreaElement);
    }

    // Gallery chrome video links. We deliberately scope to the known gallery
    // button classes so we don't accidentally turn unrelated anchors into
    // video players. Empty `ns://Video/` hrefs are ignored.
    for (const a of Array.from(doc.querySelectorAll(GALLERY_BUTTON_CLASSES.map((c) => `.${c} a`).join(', ')))) {
        bindVideoAnchor(a as HTMLAnchorElement);
    }
}
