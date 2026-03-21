/**
 * Cinefex Archive - Router Module
 * Hash-based routing for deep linking to issues and articles
 * @module router
 *
 * Supported routes:
 *   #issue/{number}                       - Opens issue modal
 *   #issue/{number}/article/{index}       - Opens article view options
 *   #issue/{number}/article/{index}/read  - Opens reading view directly
 *   #issue/{number}/article/{index}/archive - Opens archival view directly
 */

/** @typedef {import('./types.js').Magazine} Magazine */

import { allMagazines } from './archive.js';
import { openModal } from './modal.js';
import { openViewer } from './viewer.js';

/**
 * Initializes hash-based routing.
 * Must be called after archive data is loaded.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    // Handle initial route on page load (deferred to allow data to load)
    setTimeout(handleRoute, 500);
}

/**
 * Updates the URL hash without triggering hashchange
 * @param {string} hash - New hash value
 */
export function updateHash(hash) {
    history.replaceState(null, '', hash);
}

/**
 * Parses the current hash and navigates accordingly
 */
function handleRoute() {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const issueMatch = hash.match(/^#issue\/(\d+)(?:\/article\/(\d+)(?:\/(read|archive))?)?$/);
    if (!issueMatch) return;

    const issueNumber = parseInt(issueMatch[1], 10);
    const articleIndex = issueMatch[2] !== undefined ? parseInt(issueMatch[2], 10) : null;
    const viewMode = issueMatch[3] || null;

    const magazine = allMagazines.find((m) => m.issue === issueNumber);
    if (!magazine) return;

    if (articleIndex !== null && viewMode && magazine.articles[articleIndex]) {
        const article = magazine.articles[articleIndex];
        const url = viewMode === 'read' ? article.readingUrl : article.archiveUrl;
        openViewer(url, magazine.issue);
    } else {
        openModal(magazine);
    }
}
