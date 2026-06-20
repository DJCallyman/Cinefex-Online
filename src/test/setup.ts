// Vitest setup. Extend with global mocks, matchers, etc. as the suite grows.
//
// The test environment is jsdom (see vite.config.ts), which provides a
// working `localStorage` and `window`. We clear localStorage before every
// test so state from one test (e.g. bookmarks, theme preference) can't
// leak into the next. Individual tests that need a specific initial state
// should set it up inside their own `beforeEach`/`it` body after this runs.
import { beforeEach } from 'vitest';

beforeEach(() => {
    localStorage.clear();
});
