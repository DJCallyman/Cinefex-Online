/**
 * Cinefex Archive - Shared Type Definitions
 * @module types
 */

/**
 * @typedef {Object} Article
 * @property {string} name - Film/subject name (from HTML's Film meta tag)
 * @property {string} readingUrl - URL to the reading view HTML
 * @property {string} archiveUrl - URL to the archival/original layout HTML
 * @property {string} [articleTitle] - Full article title (if different from name)
 */

/**
 * @typedef {Object} Magazine
 * @property {number} issue - Issue number
 * @property {string} title - Composite title (joined article names)
 * @property {number} year - Publication year
 * @property {Article[]} articles - Array of articles in this issue
 */

export {};
