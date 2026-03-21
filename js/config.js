/**
 * Cinefex Archive - Configuration Module
 * Centralized configuration constants
 */

/**
 * Issues with number ≤ this threshold use the old iPad format.
 * Issues > this threshold use the new web format.
 */
export const FORMAT_THRESHOLD = 126;

/** Path to the JSON data file containing all issue metadata */
export const DATA_URL = 'issues_full.json';

/** Pattern for constructing cover image paths */
export const COVER_PATH_PATTERN = (issue) => `covers/${issue}/cover512.jpg`;

/** Fallback placeholder for missing covers */
export const COVER_FALLBACK_PATTERN = (issue) =>
    `https://placehold.co/450x400/111827/ffffff?text=Issue+${issue}`;
