import { describe, it, expect } from 'vitest';
import { enhanceVideoLinks } from '../videoModal';

function buildTestDoc(): Document {
    const html = `<!DOCTYPE html>
<html>
<head><title>video test</title></head>
<body>
    <div class="page">
        <img src="images/p1.png" usemap="#M1" width="1024" height="768"/>
        <map name="M1">
            <area id="area1" shape="rect" coords="892,229,946,283" href="ns://Video/XX-V1.mp4">
            <area id="area-empty" shape="rect" coords="0,0,10,10" href="ns://Video/">
            <area id="area-external" shape="rect" coords="0,0,10,10" href="https://example.com">
        </map>
    </div>

    <div class="imageGalleryPage">
        <div class="new_button-left">
            <a id="sound1" href="#"><img src="images/button-sound.jpg"/></a>
            <a id="video1" href="ns://Video/XX-V2.mp4"><img src="images/video_icon.png"/></a>
        </div>
        <div class="new_button-top">
            <a id="empty-video" href="ns://Video/"><img src="images/video_icon.png"/></a>
        </div>
    </div>
</body>
</html>`;
    return new DOMParser().parseFromString(html, 'text/html');
}

function click(el: Element): void {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('enhanceVideoLinks', () => {
    it('rewrites manuscript <area> ns://Video hrefs to relative videos/ paths', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);

        expect(doc.getElementById('area1')?.getAttribute('href')).toBe('videos/XX-V1.mp4');
        expect(doc.getElementById('area-empty')?.getAttribute('href')).toBe('ns://Video/');
        expect(doc.getElementById('area-external')?.getAttribute('href')).toBe('https://example.com');
    });

    it('rewrites gallery <a> ns://Video hrefs and reveals the parent block', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);

        expect(doc.getElementById('video1')?.getAttribute('href')).toBe('videos/XX-V2.mp4');
        expect(doc.getElementById('video1')?.classList.contains('cinefex-video-button')).toBe(true);
        expect(doc.getElementById('video1')?.closest('.new_button-left')?.classList.contains('has-cinefex-video')).toBe(true);

        // Empty-video payload is left alone and does not reveal its parent.
        expect(doc.getElementById('empty-video')?.getAttribute('href')).toBe('ns://Video/');
        expect(doc.getElementById('empty-video')?.closest('.new_button-top')?.classList.contains('has-cinefex-video')).toBe(false);
    });

    it('opens an in-document video modal when an <area> is clicked', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);
        const area = doc.getElementById('area1') as HTMLAreaElement;
        click(area);

        const modal = doc.querySelector('.cinefex-video-modal');
        expect(modal).not.toBeNull();
        const video = modal?.querySelector('video');
        expect(video).not.toBeNull();
        expect(video?.getAttribute('src')).toBe('videos/XX-V1.mp4');
        expect(video?.hasAttribute('controls')).toBe(true);
        expect(video?.autoplay).toBe(true);
    });

    it('opens an in-document video modal when a gallery video anchor is clicked', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);
        const link = doc.getElementById('video1') as HTMLAnchorElement;
        click(link);

        const video = doc.querySelector('.cinefex-video-modal video');
        expect(video).not.toBeNull();
        expect(video?.getAttribute('src')).toBe('videos/XX-V2.mp4');
    });

    it('closes the modal when the backdrop is clicked', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);
        click(doc.getElementById('area1') as HTMLAreaElement);

        const modal = doc.querySelector('.cinefex-video-modal') as HTMLElement;
        click(modal);
        expect(doc.querySelector('.cinefex-video-modal')).toBeNull();
    });

    it('closes the modal when the close button is clicked', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);
        click(doc.getElementById('area1') as HTMLAreaElement);

        const close = doc.querySelector('.cinefex-video-modal__close') as HTMLElement;
        click(close);
        expect(doc.querySelector('.cinefex-video-modal')).toBeNull();
    });

    it('closes the modal when Escape is pressed', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);
        click(doc.getElementById('area1') as HTMLAreaElement);

        doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(doc.querySelector('.cinefex-video-modal')).toBeNull();
    });

    it('is idempotent', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);
        enhanceVideoLinks(doc);
        enhanceVideoLinks(doc);

        // Clean up any open modals from the repeated binds.
        doc.querySelectorAll('.cinefex-video-modal').forEach((m) => m.remove());

        const area = doc.getElementById('area1') as HTMLAreaElement;
        click(area);
        expect(doc.querySelectorAll('.cinefex-video-modal').length).toBe(1);
    });

    it('injects the video modal stylesheet once', () => {
        const doc = buildTestDoc();
        enhanceVideoLinks(doc);
        enhanceVideoLinks(doc);
        expect(doc.querySelectorAll('#cinefex-video-modal-styles').length).toBe(1);
    });
});
