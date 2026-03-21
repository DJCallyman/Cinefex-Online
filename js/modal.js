/**
 * Cinefex Archive - Modal Module
 * Handles issue detail modals and article selection
 * @module modal
 */

/** @typedef {import('./types.js').Magazine} Magazine */
/** @typedef {import('./types.js').Article} Article */

import { openViewer } from './viewer.js';
import { COVER_PATH_PATTERN, COVER_FALLBACK_PATTERN } from './config.js';

// DOM Elements (initialized via initModal)
let modal;
let modalOverlay;
let modalContent;

// Track element that opened modal for focus restoration
let previouslyFocusedElement = null;

/**
 * Initializes modal DOM references and overlay click handler.
 * Must be called after DOMContentLoaded.
 */
export function initModal() {
    modal = document.getElementById('modal');
    modalOverlay = document.getElementById('modal-overlay');
    modalContent = document.getElementById('modal-content');

    modalOverlay.addEventListener('click', closeModal);
}

/**
 * Opens the issue detail modal
 * @param {Magazine} magazine - Magazine data object
 */
export function openModal(magazine) {
    // Store currently focused element for restoration
    previouslyFocusedElement = document.activeElement;
    
    const coverPath = COVER_PATH_PATTERN(magazine.issue);
    const fallbackPath = COVER_FALLBACK_PATTERN(magazine.issue);
    
    modalContent.innerHTML = `
        <div class="w-full md:w-1/2 p-0">
            <img id="modal-cover-img" src="${coverPath}" alt="Cover of Cinefex Issue ${magazine.issue}" class="w-full h-full object-cover">
        </div>
        <div id="modal-dynamic-content" class="w-full md:w-1/2 p-6 sm:p-8 flex flex-col"></div>
        <button id="modal-close" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10" aria-label="Close modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
    
    // Set up image error handling
    const coverImg = document.getElementById('modal-cover-img');
    coverImg.addEventListener('error', function() {
        this.src = fallbackPath;
    }, { once: true });
    
    displayArticleList(magazine);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Set up close button and focus management
    const closeBtn = document.getElementById('modal-close');
    closeBtn.addEventListener('click', closeModal);
    
    // Focus the close button for keyboard users
    setTimeout(() => closeBtn.focus(), 100);
    
    // Trap focus within modal
    modal.addEventListener('keydown', trapFocus);
}

/**
 * Displays the article list for a magazine
 * @param {Object} magazine - Magazine data object
 */
function displayArticleList(magazine) {
    const dynamicContent = document.getElementById('modal-dynamic-content');
    const articlesHtml = magazine.articles.map((article, index) => 
        `<button class="article-btn w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-white" data-article-index='${index}' data-issue-number='${magazine.issue}'>${article.name}</button>`
    ).join('');

    dynamicContent.innerHTML = `
        <div class="flex-grow overflow-y-auto">
            <span class="text-sm font-semibold text-cyan-400">CINEFEX #${magazine.issue}</span>
            <h2 id="modal-title" class="text-2xl sm:text-3xl font-bold mt-2 mb-4">${magazine.title}</h2>
            <h3 class="font-bold text-lg mb-3 text-gray-200">Articles</h3>
            <div class="space-y-3">${articlesHtml}</div>
        </div>
    `;

    dynamicContent.querySelectorAll('.article-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const articleIndex = parseInt(btn.dataset.articleIndex);
            const issueNumber = parseInt(btn.dataset.issueNumber);
            const articleData = magazine.articles[articleIndex];
            displayViewOptions({ ...magazine, issue: issueNumber }, articleData);
        });
    });
}

/**
 * Displays view options for a selected article
 * @param {Object} magazine - Magazine data object
 * @param {Object} article - Article data object
 */
function displayViewOptions(magazine, article) {
    const dynamicContent = document.getElementById('modal-dynamic-content');
    const articleTitleHtml = article.articleTitle 
        ? `<p class="text-lg text-gray-300 mt-1 mb-4">${article.articleTitle}</p>` 
        : '';
    
    dynamicContent.innerHTML = `
        <div class="flex-grow">
            <button id="back-to-articles" class="text-sm text-cyan-400 hover:text-cyan-300 mb-4 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                Back to Article List
            </button>
            <span class="text-sm font-semibold text-cyan-400">CINEFEX #${magazine.issue}</span>
            <h2 id="modal-title" class="text-2xl sm:text-3xl font-bold mt-2">${article.name}</h2>
            ${articleTitleHtml}
            <p class="text-gray-300 leading-relaxed mb-6">Select a format to view the article.</p>
        </div>
        <div class="mt-auto flex flex-col sm:flex-row gap-4">
            <button id="read-online-btn" class="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-md font-semibold transition-colors text-white">Read Online</button>
            <button id="view-layout-btn" class="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold transition-colors text-white">View Original Layout</button>
        </div>
    `;
    
    document.getElementById('back-to-articles').addEventListener('click', () => displayArticleList(magazine));
    document.getElementById('read-online-btn').addEventListener('click', () => openViewer(article.readingUrl, magazine.issue));
    document.getElementById('view-layout-btn').addEventListener('click', () => openViewer(article.archiveUrl, magazine.issue));
}

/**
 * Closes the modal and restores focus
 */
export function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal.removeEventListener('keydown', trapFocus);
    
    // Restore focus to previously focused element
    if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null;
    }
}

/**
 * Traps focus within the modal for accessibility
 * @param {KeyboardEvent} e - Keyboard event
 */
function trapFocus(e) {
    if (e.key !== 'Tab') return;
    
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
    }
}

// Set up overlay click handler moved to initModal()

export { displayArticleList };
