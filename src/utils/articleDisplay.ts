/**
 * React-friendly wrapper around `cleanArticleTitle`.
 *
 * The pure logic lives in `./cleanArticleTitle.ts` so it can be shared
 * between the React UI (here) and the build-time search-index generator
 * (`scripts/build-search-index.mjs`). This file keeps the historical
 * `displayTitle(name, articleTitle)` argument order and null-return
 * contract so the modal and bookmarks view can keep importing it.
 */
export { cleanArticleTitle as displayTitle } from './cleanArticleTitle';
