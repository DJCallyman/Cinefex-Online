import { useState, useEffect, useCallback } from 'react';
import { Article } from '../../types';

interface ArticleGalleryProps {
    article: Article;
    issueNumber: number;
}

interface GalleryImage {
    src: string;
    alt: string;
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
            // Resolve relative to the article URL
            try {
                const resolved = new URL(src, base).href;
                return { src: resolved, alt: img.alt || '' };
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
        const url = article.readingUrl;
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
    }, [article.readingUrl, issueNumber]);

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
                            className="group relative overflow-hidden rounded-lg bg-gray-800 hover:ring-2 hover:ring-cyan-400 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
                            onClick={() => setLightboxSrc(img.src)}
                            aria-label={img.alt || `Image ${idx + 1}`}
                        >
                            <img
                                src={img.src}
                                alt={img.alt}
                                className="w-full h-auto block"
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
