/**
 * Cinefex Archive - Application Entry Point
 * Initializes the application and sets up global event handlers
 */

import { initializeArchive } from './archive.js';
import { closeModal } from './modal.js';
import { closeViewer } from './viewer.js';

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

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeArchive();
});
