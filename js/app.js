/**
 * Cinefex Archive - Application Entry Point
 * Initializes the application and sets up global event handlers
 */

import { initializeArchive } from './archive.js';
import { closeModal, initModal } from './modal.js';
import { closeViewer, initViewer } from './viewer.js';
import { initSearch } from './search.js';
import { initRouter } from './router.js';

/**
 * Initialize all modules and set up global event handlers.
 * Called after DOMContentLoaded to ensure DOM elements exist.
 */
async function initApp() {
    // Initialize modules with their DOM dependencies
    initModal();
    initViewer();

    // Global keyboard handler for Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const viewer = document.getElementById('viewer');
            const modal = document.getElementById('modal');

            if (!viewer.classList.contains('hidden')) {
                closeViewer();
            } else if (!modal.classList.contains('hidden')) {
                closeModal();
            }
        }
    });

    // Load and render the archive, then init search and routing
    await initializeArchive();
    initSearch();
    initRouter();

    // Scroll-to-top button
    const scrollTopBtn = document.getElementById('scroll-top');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            scrollTopBtn.classList.toggle('visible', window.scrollY > window.innerHeight);
        }, { passive: true });
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
        });
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
