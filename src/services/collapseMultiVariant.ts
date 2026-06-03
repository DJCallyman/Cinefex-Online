/**
 * Detect and collapse multi-variant photo spreads (127+ image galleries).
 *
 * In the original iPad data, pages that show "the same magazine spread with 2–5 alternate
 * hero photographs" (different stages of a VFX shot, different angles, etc.) were exported
 * as N nearly-identical <page> blocks. They all reference the exact same background PNG
 * (which contains the caption plate) and only differ in the main overlaid JPG.
 *
 * The original iPad app used native ns://Page/ links + thumbnail taps to swap the hero image
 * while keeping the caption. In the static HTML this produced duplicate pages.
 *
 * This function collapses each such group down to a single page with a functional
 * client-side thumbnail switcher, so the web viewer shows one logical spread with
 * working thumbnails instead of 3–4 near-identical pages in a row.
 */
export function collapseMultiVariantGalleryPages(doc: Document): void {
    const allPages = Array.from(doc.querySelectorAll('page'));

    if (allPages.length === 0) return;

    let i = 0;
    while (i < allPages.length) {
        const pageEl = allPages[i] as HTMLElement;
        const galleryPage = pageEl.querySelector('.imageGalleryPage') as HTMLElement | null;

        if (!galleryPage) {
            i++;
            continue;
        }

        // Get the background image URL (from inline style)
        const bgStyle = galleryPage.style.backgroundImage || galleryPage.getAttribute('style') || '';
        const bgUrlMatch = bgStyle.match(/url\(([^)]+)\)/i);
        const bgUrl = bgUrlMatch ? bgUrlMatch[1].replace(/["']/g, '').trim() : null;

        if (!bgUrl) {
            i++;
            continue;
        }

        // Collect the run of consecutive pages that share this exact background
        const group: HTMLElement[] = [pageEl];
        let j = i + 1;
        while (j < allPages.length) {
            const nextPage = allPages[j] as HTMLElement;
            const nextGallery = nextPage.querySelector('.imageGalleryPage') as HTMLElement | null;
            if (!nextGallery) break;

            const nextBgStyle = nextGallery.style.backgroundImage || nextGallery.getAttribute('style') || '';
            const nextBgMatch = nextBgStyle.match(/url\(([^)]+)\)/i);
            const nextBg = nextBgMatch ? nextBgMatch[1].replace(/["']/g, '').trim() : null;

            if (nextBg === bgUrl) {
                group.push(nextPage);
                j++;
            } else {
                break;
            }
        }

        if (group.length >= 2) {
            // The first page in the group is the "canonical" one we will keep and enhance.
            const canonicalPage = group[0];
            const canonicalGallery = canonicalPage.querySelector('.imageGalleryPage') as HTMLElement;

            // Collect the hero images for each variant (the <img> that is the main photograph)
            const variants: { imgSrc: string; thumbSrcs: string[] }[] = [];

            for (const g of group) {
                const heroImg = g.querySelector('.imageGalleryPage > div > img, .imageGalleryPage img') as HTMLImageElement | null;
                const imgSrc = heroImg ? heroImg.getAttribute('src') || '' : '';

                // The original HTML already has a .thumbs container with the correct thumbnail images.
                // We will reuse those <img> elements' src values (they are the real -th01.jpg etc. files).
                const thumbImgs = Array.from(g.querySelectorAll('.thumbs img')) as HTMLImageElement[];
                const thumbSrcs = thumbImgs.map(img => img.getAttribute('src') || '').filter(Boolean);

                if (imgSrc) {
                    variants.push({ imgSrc, thumbSrcs });
                }
            }

            if (variants.length >= 2) {
                // Remove all duplicate pages after the first one
                for (let k = 1; k < group.length; k++) {
                    const dup = group[k];
                    if (dup.parentNode) {
                        dup.parentNode.removeChild(dup);
                    }
                }

                // For multi-variant gallery pages, create a functional thumbnail switcher
                // and position it reliably in the bottom-right of the designed plate
                // (independent of the old .thumbs margin div, which was laid out for the native app).
                if (variants.length > 1) {
                    // Remove any old .thumbs blocks for this canonical page so they don't fight positioning
                    canonicalGallery.querySelectorAll('.thumbs').forEach(t => t.remove());

                    // Build the switcher strip and append it directly to the gallery page container
                    // (which has position:relative from our archival styles).
                    const strip = doc.createElement('div');
                    strip.className = 'variant-thumbs';
                    strip.style.cssText = `
                        position: absolute;
                        right: 18px;
                        bottom: 14px;
                        display: flex;
                        flex-wrap: wrap;
                        width: 63px;
                        gap: 3px;
                        z-index: 30;
                        background: rgba(0,0,0,0.45);
                        padding: 2px;
                        border-radius: 2px;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                    `;

                    variants.forEach((variant, idx) => {
                        let thumbSrc = variant.thumbSrcs[0] || '';
                        if (!thumbSrc && variant.imgSrc) {
                            thumbSrc = variant.imgSrc.replace(/\.jpg$/i, '-th01.jpg');
                        }

                        const btn = doc.createElement('button');
                        btn.type = 'button';
                        btn.style.cssText = `
                            border: 1px solid rgba(255,255,255,0.5);
                            background: transparent;
                            padding: 0;
                            margin: 0;
                            cursor: pointer;
                            width: 30px;
                            height: 22px;
                            overflow: hidden;
                            border-radius: 1px;
                            opacity: ${idx === 0 ? '1' : '0.65'};
                            transition: opacity 0.1s ease, border-color 0.1s ease, transform 0.1s ease;
                            flex-shrink: 0;
                        `;
                        btn.setAttribute('data-variant-index', String(idx));
                        btn.setAttribute('aria-label', `Show variant ${idx + 1}`);

                        if (thumbSrc) {
                            const timg = doc.createElement('img');
                            timg.src = thumbSrc;
                            timg.style.cssText = 'width:100%; height:100%; object-fit: cover; display:block;';
                            btn.appendChild(timg);
                        } else {
                            btn.textContent = String(idx + 1);
                            btn.style.color = '#fff';
                            btn.style.fontSize = '9px';
                            btn.style.lineHeight = '22px';
                            btn.style.textAlign = 'center';
                            btn.style.background = 'rgba(0,0,0,0.3)';
                        }

                        btn.addEventListener('click', () => {
                            const currentHero = canonicalGallery.querySelector('.imageGalleryPage > div > img, .imageGalleryPage img') as HTMLImageElement | null;
                            if (currentHero && variant.imgSrc && currentHero.src !== variant.imgSrc) {
                                currentHero.src = variant.imgSrc;
                            }

                            strip.querySelectorAll('button').forEach(b => {
                                const bb = b as HTMLElement;
                                bb.style.opacity = '0.65';
                                bb.style.borderColor = 'rgba(255,255,255,0.5)';
                                bb.setAttribute('aria-pressed', 'false');
                            });
                            btn.style.opacity = '1';
                            btn.style.borderColor = '#fff';
                            btn.setAttribute('aria-pressed', 'true');
                        });

                        if (idx === 0) {
                            btn.setAttribute('aria-pressed', 'true');
                        }

                        strip.appendChild(btn);
                    });

                    canonicalGallery.appendChild(strip);
                }
            }
        }

        // Advance past the group we just processed
        i = j;
    }
}
