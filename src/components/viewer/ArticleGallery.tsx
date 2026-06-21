import { useState, useEffect, useCallback } from 'react';
import { Article } from '../../types';

interface ArticleGalleryProps {
    article: Article;
    issueNumber: number;
}

interface GalleryImage {
    src: string;
    alt: string;
    /**
     * Full-resolution URL for the lightbox. Falls back to `src` when no
     * larger variant is available (e.g. new-format imageGallery files,
     * which already point at full-size images).
     */
    fullSrc: string;
}

/**
 * For legacy issues (1-126), the ReadingView HTML references 400px-wide
 * thumbnails under `images_400/`. The full-resolution versions live in a
 * sibling `images/` directory with identical filenames. Rewrite the path
 * so the lightbox shows the full-size image instead of the thumbnail.
 *
 * New-format issues (127+) already reference full-size images directly
 * from `imageGallery*.html`, so this is a no-op for them.
 */
function toFullSizeSrc(resolvedSrc: string): string {
    return resolvedSrc.replace(/\/images_400\//, '/images/');
}

function extractImages(html: string, baseUrl: string): GalleryImage[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgs = Array.from(doc.querySelectorAll<HTMLImageElement>('img'));
    const base = new URL(baseUrl, window.location.href);

    return imgs
        .map((img) => {
            const src = img.getAttribute('src') ?? '';
            if (!src || src.startsWith('data:')) return null;
            // Skip the publisher's iPad chrome: thumbnail strip, navigation
            // buttons, and the video play-icon. These appear inside the
            // imageGallery*.html for new-format issues and would otherwise
            // flood the gallery with hundreds of duplicate 1×1 navigators.
            if (src.includes('th0') || src.includes('button-') || src.includes('video_icon')) {
                return null;
            }
            // Resolve relative to the article URL
            try {
                const resolved = new URL(src, base).href;
                return { src: resolved, alt: img.alt || '', fullSrc: toFullSizeSrc(resolved) };
            } catch {
                return null;
            }
        })
        .filter((x): x is GalleryImage => x !== null);
}

export function ArticleGallery({ article, issueNumber }: ArticleGalleryProps) {
    const [images, setImages] = useState<GalleryImage[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    useEffect(() => {
        // New-format issues (127+) split the article across multiple files:
        // the readingView*.html holds the text only, and the actual
        // screenshots/photos live in imageGallery*.html. Old-format issues
        // (1-126) inline all images into the ReadingView, so the readingUrl
        // is the correct source there. Prefer the dedicated gallery file
        // when the metadata provides one; fall back to the reading view.
        const url = article.imageGalleryUrl ?? article.readingUrl;
        setImages(null);
        setError(null);
        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
            })
            .then((html) => {
                const imgs = extractImages(html, url);
                setImages(imgs);
            })
            .catch((e: Error) => {
                setError(e.message);
            });
    }, [article.readingUrl, article.imageGalleryUrl, issueNumber]);

    const closeLightbox = useCallback(() => setLightboxSrc(null), []);

    // Keyboard handler for lightbox
    useEffect(() => {
        if (!lightboxSrc) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [lightboxSrc, closeLightbox]);

    if (images === null && !error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400 text-sm">
                Failed to load article content.
            </div>
        );
    }

    if (!images || images.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400 text-sm">
                No images found in this article.
            </div>
        );
    }

    return (
        <>
            <div className="w-full h-full overflow-y-auto bg-gray-900 pt-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            className="group relative overflow-hidden rounded-lg bg-gray-800 hover:ring-2 hover:ring-cyan-400 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 aspect-[4/3]"
                            onClick={() => setLightboxSrc(img.fullSrc)}
                            aria-label={img.alt || `Image ${idx + 1}`}
                        >
                            <img
                                src={img.src}
                                alt={img.alt}
                                className="w-full h-full object-cover block"
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>
            </div>

            {lightboxSrc && (
                <div
                    className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center cursor-zoom-out"
                    onClick={closeLightbox}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Image lightbox"
                >
                    <img
                        src={lightboxSrc}
                        alt=""
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        className="absolute top-4 right-4 text-gray-300 hover:text-white bg-black/50 rounded-full p-2 transition-colors"
                        onClick={closeLightbox}
                        aria-label="Close lightbox"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
}
