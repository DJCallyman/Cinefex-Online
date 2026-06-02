export const CONFIG = {
    FORMAT_THRESHOLD: 126,
    DATA_URL: '/issues_full.json',
    DEBOUNCE_MS: 300,
    COVER_SIZE: 512, // intrinsic pixel size of every cover image on disk
    COVER_ASPECT: 1, // covers are square; used for the fallback placeholder too
} as const;

export const COVER_PATH = (issue: number) => `/covers/${issue}/cover512.jpg`;

export const COVER_FALLBACK = (issue: number) => `https://placehold.co/450x400/111827/ffffff?text=Issue+${issue}`;
