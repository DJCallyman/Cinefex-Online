/**
 * Cinefex Archive - Main Application Module
 * Handles data loading, magazine grid rendering, and navigation
 * @module archive
 */

/** @typedef {import('./types.js').Magazine} Magazine */
/** @typedef {import('./types.js').Article} Article */

import { openModal } from './modal.js';
import { FORMAT_THRESHOLD, DATA_URL, COVER_PATH_PATTERN, COVER_FALLBACK_PATTERN } from './config.js';

// DOM Elements (initialized lazily via initializeArchive)
let grid;
let navContainer;
let loadingIndicator;

/** @type {Magazine[]} All loaded magazine data */
let allMagazines = [];

/**
 * Fetches issue data from JSON file and initializes the application.
 */
export async function initializeArchive() {
    grid = document.getElementById('magazine-grid');
    navContainer = document.querySelector('#bucket-nav div');
    loadingIndicator = document.getElementById('loading-indicator');

    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allMagazines = await response.json();
        loadingIndicator.style.display = 'none';
        renderMagazines(allMagazines);
    } catch (error) {
        loadingIndicator.textContent = 'Failed to load archive data. Please try refreshing the page.';
        console.error("Error loading archive data:", error);
    }
}

/**
 * Renders magazines grouped by year buckets
 * @param {Array} magazines - Array of magazine objects
 */
function renderMagazines(magazines) {
    grid.replaceChildren();
    const buckets = magazines.reduce((acc, magazine) => {
        let bucketKey;
        if (magazine.year <= 1985) bucketKey = '1980-1985';
        else {
            const startYear = Math.floor((magazine.year - 1) / 5) * 5 + 1;
            const endYear = startYear + 4;
            bucketKey = `${startYear}-${endYear}`;
        }
        if (!acc[bucketKey]) acc[bucketKey] = [];
        acc[bucketKey].push(magazine);
        return acc;
    }, {});

    const sortedBucketKeys = Object.keys(buckets).sort((a, b) => 
        parseInt(a.split('-')[0]) - parseInt(b.split('-')[0])
    );
    renderNavigation(sortedBucketKeys);

    sortedBucketKeys.forEach(key => {
        const bucketContainer = document.createElement('section');
        bucketContainer.id = `bucket-${key}`;
        bucketContainer.className = 'pt-24 -mt-24';
        
        const header = document.createElement('h2');
        header.className = 'text-3xl font-bold mt-12 mb-6 text-cyan-400 border-b border-gray-700 pb-2';
        header.textContent = key;
        bucketContainer.appendChild(header);
        
        const bucketGrid = document.createElement('div');
        bucketGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8';
        
        buckets[key].forEach(magazine => {
            const coverElement = createCoverElement(magazine);
            bucketGrid.appendChild(coverElement);
        });
        
        bucketContainer.appendChild(bucketGrid);
        grid.appendChild(bucketContainer);
    });
}

/**
 * Creates a magazine cover element with lazy loading
 * @param {Object} magazine - Magazine data object
 * @returns {HTMLElement} Cover element
 */
function createCoverElement(magazine) {
    const coverElement = document.createElement('div');
    coverElement.className = 'magazine-cover cursor-pointer group';
    coverElement.setAttribute('tabindex', '0');
    coverElement.setAttribute('role', 'button');
    coverElement.setAttribute('aria-label', `View Issue ${magazine.issue} (${magazine.year})`);
    
    const coverPath = COVER_PATH_PATTERN(magazine.issue);
    const fallbackPath = COVER_FALLBACK_PATTERN(magazine.issue);
    
    const img = document.createElement('img');
    img.src = coverPath;
    img.alt = `Cover of Cinefex Issue ${magazine.issue}`;
    img.className = 'w-full rounded-lg shadow-lg object-cover';
    img.loading = 'lazy';
    img.addEventListener('error', function() {
        this.src = fallbackPath;
    }, { once: true });
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'mt-3 text-center';
    infoDiv.innerHTML = `
        <h3 class="font-semibold text-white">Issue ${magazine.issue}</h3>
        <p class="text-sm text-gray-300 group-hover:text-white transition-colors">${magazine.year}</p>
    `;
    
    coverElement.appendChild(img);
    coverElement.appendChild(infoDiv);
    coverElement.addEventListener('click', () => openModal(magazine));
    coverElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(magazine);
        }
    });
    
    return coverElement;
}

/**
 * Renders year bucket navigation links
 * @param {Array} bucketKeys - Array of bucket key strings
 */
function renderNavigation(bucketKeys) {
    navContainer.innerHTML = '';
    bucketKeys.forEach(key => {
        const link = document.createElement('a');
        link.href = `#bucket-${key}`;
        link.textContent = key;
        link.className = 'px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-semibold hover:bg-cyan-500 hover:text-white transition-colors';
        link.setAttribute('aria-label', `Browse issues from ${key.replace('-', ' to ')}`);
        navContainer.appendChild(link);
    });
}

export { FORMAT_THRESHOLD, allMagazines, renderMagazines };
