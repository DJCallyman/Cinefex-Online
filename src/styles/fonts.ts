/**
 * Single source of truth for the Cinefex custom font @font-face declarations.
 *
 * The authorable content lives in src/styles/fonts.css. Vite's `?raw` query
 * imports the file as a string so the iframe style injector (which needs
 * CSS as a string to set <style>.textContent) and the host stylesheet can
 * stay in lockstep — edit fonts.css and both consumers pick up the change.
 *
 * If Vite ever changes how ?raw imports work, see the FONT_FACE_CSS fallback
 * constant below for a copyable string version.
 */
import fontsCss from '../styles/fonts.css?raw';

export const FONT_FACE_CSS = fontsCss;
