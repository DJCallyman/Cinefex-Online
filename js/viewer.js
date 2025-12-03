/**
 * Cinefex Archive - Viewer Module
 * Handles article viewing in iframe with style injection
 */

import { closeModal } from './modal.js';
import { FORMAT_THRESHOLD } from './archive.js';

// DOM Elements
const viewer = document.getElementById('viewer');
const viewerIframe = document.getElementById('viewer-iframe');
const viewerCloseBtn = document.getElementById('viewer-close');

// Track element that opened viewer for focus restoration
let previouslyFocusedElement = null;

/**
 * Opens the article viewer with loading indicator
 * @param {string} url - Article URL to load
 * @param {number} issueNumber - Issue number for format detection
 */
export function openViewer(url, issueNumber) {
    // Store currently focused element for restoration
    previouslyFocusedElement = document.activeElement;
    
    closeModal();
    
    // Show loading spinner
    showLoadingSpinner();
    
    viewer.classList.remove('hidden');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Detect view type from URL
    const urlLower = url.toLowerCase();
    const isReadingView = urlLower.includes('readingview');
    const isArchivalView = urlLower.includes('archivalview') || urlLower.includes('manuscript');
    const isOldFormat = issueNumber <= FORMAT_THRESHOLD;
    const isNewFormat = issueNumber > FORMAT_THRESHOLD;

    // IMPORTANT: Set onload handler BEFORE setting src to avoid race condition
    viewerIframe.onload = () => {
        hideLoadingSpinner();
        
        // Route to appropriate injection function based on format and view type
        if (isNewFormat && isReadingView) {
            injectNewReadingViewStyles(viewerIframe);
        } else if (isOldFormat && isArchivalView) {
            injectOldArchivalViewStyles(viewerIframe);
        } else if (isOldFormat && isReadingView) {
            injectOldReadingViewStyles(viewerIframe);
        }
        // New format archival/manuscript view works well as-is, no injection needed
    };
    
    // Set error handler for failed loads
    viewerIframe.onerror = () => {
        hideLoadingSpinner();
        showLoadError();
    };
    
    // Now set the source
    viewerIframe.src = url;
    
    // Focus close button for keyboard users
    setTimeout(() => viewerCloseBtn.focus(), 100);
}

/**
 * Shows loading spinner overlay
 */
function showLoadingSpinner() {
    let spinner = viewer.querySelector('.loading-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.setAttribute('aria-label', 'Loading article...');
        viewer.appendChild(spinner);
    }
    spinner.style.display = 'block';
}

/**
 * Hides loading spinner
 */
function hideLoadingSpinner() {
    const spinner = viewer.querySelector('.loading-spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * Shows error message when article fails to load
 */
function showLoadError() {
    let errorMsg = viewer.querySelector('.load-error');
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.className = 'load-error absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white';
        errorMsg.innerHTML = `
            <p class="text-xl mb-4">Failed to load article</p>
            <button onclick="window.cinefexViewer.closeViewer()" class="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500">Close</button>
        `;
        viewer.appendChild(errorMsg);
    }
    errorMsg.style.display = 'block';
}

/**
 * Closes the viewer and restores focus
 */
export function closeViewer() {
    viewer.classList.add('hidden');
    viewer.setAttribute('aria-hidden', 'true');
    viewerIframe.src = '';
    document.body.style.overflow = '';
    
    // Hide any error messages
    const errorMsg = viewer.querySelector('.load-error');
    if (errorMsg) errorMsg.style.display = 'none';
    
    // Restore focus to previously focused element
    if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null;
    }
}

/**
 * Injects styles into old format (≤126) archival view to fix cropping issues.
 * The old format used 864px width + 80px left margin designed for iPad app.
 */
function injectOldArchivalViewStyles(iframe) {
    try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc) return;

        const style = doc.createElement('style');
        style.textContent = `
            /* Fix for OLD format archival view - remove margin and enable scrolling */
            html {
                margin: 0 !important;
                padding: 0 !important;
                background: #1a1a2e !important;
                overflow: auto !important;
            }
            
            body {
                margin: 0 !important;
                padding: 20px !important;
                background: #1a1a2e !important;
            }
            
            /* Style page wrapper elements - stack vertically */
            page {
                display: block !important;
                margin: 0 auto 20px auto !important;
                width: 864px !important;
            }
            
            /* Override the float and ensure pages display as blocks */
            .page {
                float: none !important;
                display: block !important;
                margin: 0 auto !important;
                box-shadow: 0 4px 30px rgba(0,0,0,0.6) !important;
                border-radius: 4px !important;
                background-size: 864px 768px !important;
            }
            
            /* Fix image sizing */
            img {
                width: auto !important;
                height: auto !important;
                max-width: 100% !important;
            }
        `;
        doc.head.appendChild(style);
    } catch (e) {
        console.error("Failed to inject old archival styles into iframe:", e);
    }
}

/**
 * Injects styles into old format (≤126) reading view.
 * Fixes float containment and uses Benguiat font from central fonts folder.
 */
function injectOldReadingViewStyles(iframe) {
    try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc) return;

        const style = doc.createElement('style');
        style.textContent = `
            /* Benguiat font definitions from central fonts folder */
            @font-face {
                font-family: "BenguiatStd-Book";
                src: url("/fonts/BenguiatStd-Book.otf") format("opentype");
                font-style: normal;
            }
            @font-face {
                font-family: "BenguiatStd-BookItalic";
                src: url("/fonts/BenguiatStd-BookItalic.otf") format("opentype");
                font-style: italic;
            }
            @font-face {
                font-family: "BenguiatStd-Medium";
                src: url("/fonts/BenguiatStd-Medium.otf") format("opentype");
                font-style: normal;
            }
            @font-face {
                font-family: "BenguiatStd-MediumItalic";
                src: url("/fonts/BenguiatStd-MediumItalic.otf") format("opentype");
                font-style: italic;
            }
            @font-face {
                font-family: "BenguiatStd-Bold";
                src: url("/fonts/BenguiatStd-Bold.otf") format("opentype");
                font-style: normal;
                font-weight: bold;
            }
            
            /* Override CaeciliaLTStd with Benguiat */
            body {
                font-family: "BenguiatStd-Book", Georgia, serif !important;
            }
            
            em, i {
                font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
                font-style: italic !important;
            }
            
            /* Strong/bold - use Medium weight to match iPad app */
            strong, b {
                font-family: "BenguiatStd-Medium", Georgia, serif !important;
                font-weight: normal !important;
            }
            
            /* Article title - use Medium weight */
            articleTitle {
                font-family: "BenguiatStd-Medium", Georgia, serif !important;
                font-weight: normal !important;
            }
            
            .dropCap span {
                font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
            }
            
            /* Page display */
            page {
                display: block !important;
            }
            
            /* Clear floats at footer and end of body */
            .footer {
                clear: both !important;
                margin-top: 2em !important;
            }
            
            body::after {
                content: "" !important;
                display: block !important;
                clear: both !important;
            }
        `;
        doc.head.appendChild(style);
    } catch (e) {
        console.error("Failed to inject old reading styles into iframe:", e);
    }
}

/**
 * Injects styles into new format (≥127) reading view to improve typography.
 * Uses centralized fonts and improves layout for web display.
 */
function injectNewReadingViewStyles(iframe) {
    try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (!doc) return;

        // Remove existing stylesheets that have broken font paths
        const existingStyles = doc.querySelectorAll('link[rel="stylesheet"]');
        existingStyles.forEach(link => {
            if (link.href.includes('Cinefex.css')) {
                link.remove();
            }
        });

        // Create optimized stylesheet for NEWER issues (127+)
        const style = doc.createElement('style');
        style.textContent = `
            /* Central font definitions - using absolute paths to /fonts/ */
            @font-face {
                font-family: "BenguiatStd-Book";
                src: url("/fonts/BenguiatStd-Book.otf") format("opentype");
                font-style: normal;
            }
            @font-face {
                font-family: "BenguiatStd-BookItalic";
                src: url("/fonts/BenguiatStd-BookItalic.otf") format("opentype");
                font-style: italic;
            }
            @font-face {
                font-family: "BenguiatStd-Medium";
                src: url("/fonts/BenguiatStd-Medium.otf") format("opentype");
                font-style: normal;
            }
            @font-face {
                font-family: "BenguiatStd-MediumItalic";
                src: url("/fonts/BenguiatStd-MediumItalic.otf") format("opentype");
                font-style: italic;
            }
            @font-face {
                font-family: "BenguiatStd-Bold";
                src: url("/fonts/BenguiatStd-Bold.otf") format("opentype");
                font-style: normal;
                font-weight: bold;
            }
            @font-face {
                font-family: "GillSansStd";
                src: url("/fonts/GillSansStd.otf") format("opentype");
                font-style: normal;
            }
            @font-face {
                font-family: "GillSansStd-Italic";
                src: url("/fonts/GillSansStd-Italic.otf") format("opentype");
                font-style: italic;
            }
            @font-face {
                font-family: "GillSans-Bold";
                src: url("/fonts/GillSans Bold.tt") format("truetype");
                font-weight: bold;
            }
            @font-face {
                font-family: "FuturaStd-ExtraBold";
                src: url("/fonts/FuturaStd-ExtraBold.otf") format("opentype");
                font-weight: bold;
            }
            @font-face {
                font-family: "DucDeBerryLTStd";
                src: url("/fonts/DucDeBerryLTStd.otf") format("opentype");
                font-style: normal;
            }

            /* Layout improvements */
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
            }
            
            body {
                background-color: #f8f9fa !important;
                color: #1e293b !important;
                padding: 2rem 4rem !important;
                max-width: 1024px !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }
            
            /* Manuscript/reading view styling */
            .manuscript, .manuscript01 {
                font-family: "BenguiatStd-Book", Georgia, serif !important;
                font-size: 16px !important;
                line-height: 30px !important;
                text-align: justify !important;
                padding: 20px !important;
                height: auto !important;
                width: auto !important;
            }
            
            /* Target text container (div.page) */
            .page {
                font-family: "BenguiatStd-Book", Georgia, serif !important;
                font-size: 16px !important;
                line-height: 30px !important;
                text-align: justify !important;
                margin-bottom: 1.5em !important;
                height: auto !important;
                width: auto !important;
            }
            
            /* Italic text */
            em, i {
                font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
                font-style: italic !important;
            }
            
            /* Drop caps */
            .dropCap span {
                font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
            }
            
            /* Captions use GillSans */
            .caption, .sideBar, .sideBarBottom {
                font-family: "GillSansStd-Italic", "Gill Sans", sans-serif !important;
            }
            
            /* Preserve image containers */
            .img-all {
                height: 660px !important;
                display: block !important;
                background-size: contain !important;
                background-position: center !important;
                background-repeat: no-repeat !important;
            }
            
            /* Hide non-image background artifacts */
            div:not(.img-all)[style*="background"] {
                display: none !important;
            }
            
            /* Page element display */
            page {
                display: block !important;
                break-inside: avoid !important;
            }
        `;
        
        // Insert at the START of head so our @font-face rules are processed first
        if (doc.head.firstChild) {
            doc.head.insertBefore(style, doc.head.firstChild);
        } else {
            doc.head.appendChild(style);
        }

        // Title injection with fallback
        const titleText = extractTitle(doc);
        if (titleText && doc.body) {
            const existingH1 = doc.querySelector('h1.injected-title');
            if (existingH1) existingH1.remove();
            
            const h1 = doc.createElement('h1');
            h1.className = 'injected-title';
            h1.textContent = titleText;
            h1.style.cssText = `
                font-size: 2.5rem;
                font-weight: bold;
                margin: 1.5rem 0;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 0.5rem;
                text-align: left;
            `;
            doc.body.insertBefore(h1, doc.body.firstChild);
        }
    } catch (e) {
        console.error("Failed to inject new reading styles into iframe:", e);
    }
}

/**
 * Extracts article title from meta tags with fallback chain.
 * @param {Document} doc - The iframe document
 * @returns {string|null} The extracted title or null
 */
function extractTitle(doc) {
    const dcTitle = doc.querySelector('meta[name="dc:Title"]');
    if (dcTitle) return dcTitle.getAttribute('content');
    
    const filmMeta = doc.querySelector('meta[name="Film"]');
    if (filmMeta) return filmMeta.getAttribute('content');
    
    const creatorMeta = doc.querySelector('meta[name="Creator"]');
    if (creatorMeta) return `Article by ${creatorMeta.getAttribute('content')}`;
    
    return null;
}

// Set up close button handler
viewerCloseBtn.addEventListener('click', closeViewer);

// Expose closeViewer globally for error button
window.cinefexViewer = { closeViewer };
