import oldArchivalCss from './oldArchival.css?raw';

declare global {
    // Vitest may return an empty string for `?raw` imports in some setups;
    // a `?url` fallback ensures we still get a path we can fetch in test envs.
    // In production this is always the raw string.
}

export const OLD_ARCHIVAL_CSS: string = oldArchivalCss;

