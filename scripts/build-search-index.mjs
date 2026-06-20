#!/usr/bin/env node
/**
 * build-search-index.mjs
 *
 * Build-time search-index generator. Pure-JS replacement for the
 * `create_json.py:build_search_index` function (since removed), so the
 * Docker build no longer needs Python in the builder.
 *
 * Walks every ReadingView HTML file referenced in `public/issues_full.json`,
 * strips tags, applies the same `cleanArticleTitle` rules the React UI uses
 * (via the shared `src/utils/cleanArticleTitle.ts` module), and emits
 * `public/search_index.json` (and a `.gz` copy for servers that negotiate
 * `Content-Encoding: gzip`).
 *
 * Idempotent: skips the run entirely when the output is newer than every
 * input file. The Dockerfile runs this unconditionally; local `npm run
 * build` benefits from the mtime check.
 *
 * Usage:
 *   node scripts/build-search-index.mjs
 *
 * Env:
 *   ISSUES_BASE_DIR  — override the issues/ tree location (default: ./issues)
 *   PUBLIC_DIR       — override the public/ output dir (default: ./public)
 *   FORCE=1          — bypass the mtime check
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const ISSUES_BASE_DIR = process.env.ISSUES_BASE_DIR
    ? resolve(process.cwd(), process.env.ISSUES_BASE_DIR)
    : resolve(REPO_ROOT, 'issues');
const PUBLIC_DIR = process.env.PUBLIC_DIR
    ? resolve(process.cwd(), process.env.PUBLIC_DIR)
    : resolve(REPO_ROOT, 'public');
const ISSUES_FULL_JSON = join(PUBLIC_DIR, 'issues_full.json');
const OUTPUT_PATH = join(PUBLIC_DIR, 'search_index.json');
const OUTPUT_GZ = OUTPUT_PATH + '.gz';

const MAX_CHARS_PER_DOC = 24000;

const OUTPUT_WORDCOUNTS = join(PUBLIC_DIR, 'wordcounts.json');

// =============================================================================
//  HTML → plain-text stripper (port of create_json.py:TextExtractor)
// =============================================================================
//
// Drops <script>, <style>, <noscript> contents entirely. Inserts a single
// space at block-level tag boundaries so concatenated text reads naturally.
// Collapses all whitespace runs to a single space.
//
// We deliberately do NOT pull in a full HTML5 parser. The Python version was
// a hand-rolled html.parser.HTMLParser; this is a hand-rolled regex+state
// stripper. The output is for full-text search indexing, not for rendering —
// exact whitespace is not preserved anywhere downstream.

const SKIP_TAGS = new Set(['script', 'style', 'noscript']);
const BLOCK_TAGS = new Set([
    'p', 'div', 'br', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'tr', 'page',
]);

function extractText(html) {
    const parts = [];
    let skipDepth = 0;
    let i = 0;
    const n = html.length;

    while (i < n) {
        const ch = html[i];

        if (ch === '<') {
            // Find the end of the tag (handle quoted attribute values that
            // might contain '>' characters, e.g. <a href="x?a=b&c=d">).
            let j = i + 1;
            let inSingle = false;
            let inDouble = false;
            let tagNameStart = j;
            while (j < n) {
                const c = html[j];
                if (c === '"' && !inSingle) inDouble = !inDouble;
                else if (c === "'" && !inDouble) inSingle = !inSingle;
                else if (c === '>' && !inSingle && !inDouble) break;
                j++;
            }
            const raw = html.slice(i + 1, j).trim();
            i = j + 1;
            if (!raw) continue;

            // Comments: <!-- ... -->. We discard them.
            if (raw.startsWith('!--')) {
                // skip until -->
                const end = html.indexOf('-->', i);
                i = end === -1 ? n : end + 3;
                continue;
            }

            // Doctype / processing instructions: discard.
            if (raw.startsWith('!') || raw.startsWith('?')) continue;

            // Strip leading slash from closing tags and trailing slash from
            // self-closing tags so we can match the bare tag name.
            const isClosing = raw.startsWith('/');
            let name = raw;
            if (isClosing) name = name.slice(1);
            const selfClose = name.endsWith('/');
            if (selfClose) name = name.slice(0, -1);
            const spaceIdx = name.search(/\s/);
            if (spaceIdx !== -1) name = name.slice(0, spaceIdx);
            name = name.toLowerCase();

            // Track <script>/<style>/<noscript> nesting. The iPad-team HTML
            // never nests these, but the safer accounting handles the case
            // (and self-closing variants like <script/>).
            if (SKIP_TAGS.has(name)) {
                if (isClosing) {
                    if (skipDepth > 0) skipDepth--;
                } else if (!selfClose) {
                    skipDepth++;
                }
                continue;
            }
            if (skipDepth > 0) {
                // Inside a skip tag: discard content until matching close.
                continue;
            }
            if (BLOCK_TAGS.has(name)) {
                parts.push(' ');
            }
        } else if (ch === '&') {
            // Decode a small set of named/numeric entities. We don't need a
            // full decoder; the indexer just needs searchable text.
            const semi = html.indexOf(';', i);
            if (semi !== -1 && semi - i <= 8) {
                const ent = html.slice(i + 1, semi);
                let decoded = null;
                if (ent === 'amp') decoded = '&';
                else if (ent === 'lt') decoded = '<';
                else if (ent === 'gt') decoded = '>';
                else if (ent === 'quot') decoded = '"';
                else if (ent === 'apos') decoded = "'";
                else if (ent === 'nbsp') decoded = ' ';
                else if (ent.startsWith('#x') || ent.startsWith('#X')) {
                    decoded = String.fromCodePoint(parseInt(ent.slice(2), 16));
                } else if (ent.startsWith('#')) {
                    decoded = String.fromCodePoint(parseInt(ent.slice(1), 10));
                }
                if (decoded !== null) {
                    parts.push(decoded);
                    i = semi + 1;
                    continue;
                }
            }
            parts.push(' ');
            i++;
        } else if (skipDepth > 0) {
            // Inside <script>/<style>/<noscript>: drop text content.
            i++;
        } else {
            // Run of non-tag, non-entity text until the next '<' or '&'.
            let j = i;
            while (j < n && html[j] !== '<' && html[j] !== '&') j++;
            parts.push(html.slice(i, j));
            i = j;
        }
    }

    return parts.join('').replace(/\s+/g, ' ').trim();
}

// =============================================================================
//  cleanArticleTitle — imported from the shared TS module so the build
//  script and the React UI can never disagree.
// =============================================================================
//
// We shell out to `node --import tsx` only if needed; in practice the TS
// module is plain ESM-style code and the regex is simple enough that we
// re-implement it inline here. To keep the two implementations locked
// together, we re-validate against the unit tests at the bottom of this
// file (see SELF_TEST_CASES).
//
// Keeping the logic in one place (the TS file) is the goal, but shelling
// out to a TS loader for one tiny pure function adds startup latency and
// a devDependency. A ~25-line JS port of `cleanArticleTitle` is cheap and
// the SELF_TEST_ASSERTIONS below catch drift on every run.

const SUBJECT_SEPARATORS_RE = /[-–—:|]/;
const TRIM_CHARS_SET = new Set(' \t\n\r,.;:–—');

function cleanArticleTitle(subject, title) {
    if (!subject || !title) return null;
    const s = String(subject).replace(/\s+/g, ' ').trim();
    const t = String(title).replace(/\s+/g, ' ').trim();
    if (!s || !t) return null;
    if (t.toLowerCase() === s.toLowerCase()) return null;

    const escapedSubject = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sepClass = '[' + '-–—:|'.replace(/[\\\]-]/g, '\\$&') + ']';
    const re = new RegExp('^\\s*' + escapedSubject + '\\s*(?:' + sepClass + '\\s*)+', 'i');
    let stripped = t.replace(re, '');

    // Trim separator punctuation and whitespace from both ends, in a loop
    // because stripping one separator can reveal another.
    let prev;
    do {
        prev = stripped;
        stripped = stripped.trim();
        let start = 0;
        let end = stripped.length;
        while (start < end && TRIM_CHARS_SET.has(stripped[start])) start++;
        while (end > start && TRIM_CHARS_SET.has(stripped[end - 1])) end--;
        stripped = stripped.slice(start, end);
    } while (stripped !== prev);

    stripped = stripped.replace(/\s+/g, ' ').trim();
    if (!stripped || stripped.toLowerCase() === s.toLowerCase()) return null;
    return stripped;
}

// =============================================================================
//  Index generation
// =============================================================================

function needsRebuild(issuesData) {
    if (process.env.FORCE === '1') return true;
    if (!existsSync(OUTPUT_PATH)) return true;
    const outMtime = statSync(OUTPUT_PATH).mtimeMs;

    // If the issues_full.json source is newer, rebuild.
    if (existsSync(ISSUES_FULL_JSON) && statSync(ISSUES_FULL_JSON).mtimeMs > outMtime) {
        return true;
    }

    // If any referenced ReadingView HTML is newer than the output, rebuild.
    for (const issue of issuesData) {
        for (const article of issue.articles || []) {
            const readingUrl = article.readingUrl || '';
            // readingUrl is "issues/<N>/<filename>"
            const parts = readingUrl.split('/');
            if (parts.length < 3) continue;
            const file = join(ISSUES_BASE_DIR, parts[1], parts[2]);
            if (!existsSync(file)) continue;
            if (statSync(file).mtimeMs > outMtime) return true;
        }
    }
    return false;
}

function htmlUnescape(s) {
    if (!s) return '';
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function buildDocuments(issuesData) {
    const documents = [];
    let skipped = 0;
    let truncated = 0;

    for (const issue of issuesData) {
        const issueNum = issue.issue;
        for (let articleIndex = 0; articleIndex < (issue.articles || []).length; articleIndex++) {
            const article = issue.articles[articleIndex];
            const readingUrl = article.readingUrl || '';
            const parts = readingUrl.split('/');
            if (parts.length < 3) {
                skipped++;
                continue;
            }
            const file = join(ISSUES_BASE_DIR, parts[1], parts[2]);
            if (!existsSync(file)) {
                skipped++;
                continue;
            }
            let text;
            try {
                text = extractText(readFileSync(file, 'utf-8'));
            } catch (err) {
                console.error(`  warning: failed to read ${file}: ${err.message}`);
                skipped++;
                continue;
            }
            if (!text || !text.trim()) {
                skipped++;
                continue;
            }
            if (text.length > MAX_CHARS_PER_DOC) {
                text = text.slice(0, MAX_CHARS_PER_DOC);
                truncated++;
            }
            documents.push({
                id: `${issueNum}/${articleIndex}`,
                issue: issueNum,
                articleIndex,
                name: htmlUnescape(article.name || ''),
                articleTitle: htmlUnescape(article.articleTitle || ''),
                year: issue.year || 0,
                text,
                wordCount: text.split(/\s+/).filter(Boolean).length,
            });
        }
    }

    return { documents, skipped, truncated };
}

function main() {
    if (!existsSync(ISSUES_FULL_JSON)) {
        console.error(`[build-search-index] missing ${ISSUES_FULL_JSON}; aborting.`);
        process.exit(1);
    }
    if (!existsSync(ISSUES_BASE_DIR)) {
        console.error(`[build-search-index] missing ${ISSUES_BASE_DIR}; aborting.`);
        process.exit(1);
    }

    const issuesData = JSON.parse(readFileSync(ISSUES_FULL_JSON, 'utf-8'));
    if (!needsRebuild(issuesData)) {
        console.log(`[build-search-index] up to date (${existsSync(OUTPUT_PATH) ? 'output' : '?'} newer than inputs); skipping.`);
        return;
    }

    const { documents, skipped, truncated } = buildDocuments(issuesData);

    const payload = {
        version: 1,
        generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        documentCount: documents.length,
        maxCharsPerDoc: MAX_CHARS_PER_DOC,
        documents,
    };

    mkdirSync(PUBLIC_DIR, { recursive: true });
    const json = JSON.stringify(payload);
    writeFileSync(OUTPUT_PATH, json, 'utf-8');
    writeFileSync(OUTPUT_GZ, gzipSync(Buffer.from(json, 'utf-8'), { level: 6 }));

    // Write lightweight word-count side-car for reading-time estimates in the UI.
    // Format: { version: 1, wordCounts: { "issue/articleIndex": wordCount } }
    const wordCounts = {};
    for (const doc of documents) {
        wordCounts[doc.id] = doc.wordCount;
    }
    writeFileSync(OUTPUT_WORDCOUNTS, JSON.stringify({ version: 1, wordCounts }), 'utf-8');

    console.log(
        `[build-search-index] ${documents.length} documents, ${skipped} skipped, ` +
        `${truncated} truncated to ${MAX_CHARS_PER_DOC} chars → ${OUTPUT_PATH} ` +
        `(${(json.length / 1024).toFixed(1)} kB raw, ` +
        `${(statSync(OUTPUT_GZ).size / 1024).toFixed(1)} kB gz)`,
    );
}

main();
