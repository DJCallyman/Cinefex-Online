/**
 * Cinefex Archive - Search Module
 * Provides filtering across issues by number, year, film name, and article title
 * @module search
 */

/** @typedef {import('./types.js').Magazine} Magazine */

import { allMagazines, renderMagazines } from './archive.js';

let searchInput;
let searchClear;
let debounceTimer;

/**
 * Initializes search UI and event handlers.
 * Must be called after DOMContentLoaded.
 */
export function initSearch() {
    searchInput = document.getElementById('search-input');
    searchClear = document.getElementById('search-clear');

    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(searchInput.value), 300);
        toggleClearButton();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        toggleClearButton();
        renderMagazines(allMagazines);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            toggleClearButton();
            searchInput.blur();
            renderMagazines(allMagazines);
        }
    });
}

/**
 * Toggles the visibility of the clear button
 */
function toggleClearButton() {
    if (searchClear) {
        searchClear.classList.toggle('hidden', !searchInput.value);
    }
}

/**
 * Performs search and filters magazines
 * @param {string} query - Search query string
 */
function performSearch(query) {
    const q = query.trim().toLowerCase();

    if (!q) {
        renderMagazines(allMagazines);
        return;
    }

    const filtered = allMagazines.filter((magazine) => {
        // Match issue number
        if (String(magazine.issue) === q) return true;

        // Match year
        if (String(magazine.year).includes(q)) return true;

        // Match composite title
        if (magazine.title.toLowerCase().includes(q)) return true;

        // Match individual article names and titles
        return magazine.articles.some((article) => {
            if (article.name.toLowerCase().includes(q)) return true;
            if (article.articleTitle && article.articleTitle.toLowerCase().includes(q)) return true;
            return false;
        });
    });

    if (filtered.length > 0) {
        renderMagazines(filtered);
    } else {
        showNoResults(query);
    }
}

/**
 * Shows a "no results" message
 * @param {string} query - The search query that produced no results
 */
function showNoResults(query) {
    const grid = document.getElementById('magazine-grid');
    grid.replaceChildren();

    const msg = document.createElement('div');
    msg.className = 'col-span-full text-center py-16';
    msg.innerHTML = `
        <p class="text-2xl text-gray-300 mb-2">No results found</p>
        <p class="text-gray-400">No issues matching "<strong class="text-white">${escapeHtml(query)}</strong>" were found.</p>
    `;
    grid.appendChild(msg);
}

/**
 * Escapes HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
