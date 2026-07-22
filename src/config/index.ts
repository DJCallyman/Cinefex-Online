export const CONFIG = {
    FORMAT_THRESHOLD: 126,
    DATA_URL: '/issues_full.json',
    DEBOUNCE_MS: 300,
    COVER_SIZE: 512, // intrinsic pixel size of every cover image on disk
    COVER_ASPECT: 1, // covers are square; used for the fallback placeholder too
} as const;

export const COVER_PATH = (issue: number) => `/covers/${issue}/cover512.jpg`;

/**
 * Inline SVG data-URI placeholder for missing covers. Self-contained (no
 * network dependency) so it works in the offline container and never leaks
 * referrers to a third-party service. Matches the dark theme background.
 */
export const COVER_FALLBACK = (issue: number) =>
    `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CONFIG.COVER_SIZE}" height="${CONFIG.COVER_SIZE}" viewBox="0 0 ${CONFIG.COVER_SIZE} ${CONFIG.COVER_SIZE}">` +
            `<rect width="100%" height="100%" fill="#111827"/>` +
            `<text x="50%" y="46%" fill="#ffffff" font-family="sans-serif" font-size="34" font-weight="bold" text-anchor="middle" dominant-baseline="middle">Cinefex</text>` +
            `<text x="50%" y="58%" fill="#67e8f9" font-family="sans-serif" font-size="28" text-anchor="middle" dominant-baseline="middle">Issue ${issue}</text>` +
            `</svg>`,
    )}`;
