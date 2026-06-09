#!/usr/bin/env node
/**
 * build-search-index.test.mjs
 *
 * Smoke tests for the JS port of the index builder. We can't import the
 * `cleanArticleTitle` function from the .mjs file (it's not exported; it's
 * the script's working implementation), so we test via a side-channel:
 * the script's behavior on a known corpus.
 *
 * Run:  node --test scripts/build-search-index.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, 'build-search-index.mjs');

describe('build-search-index.mjs', () => {
    it('emits a valid v1 payload with the right shape', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'bsi-'));
        try {
            // Minimal fake issues/ tree
            const issuesDir = join(tmp, 'issues', '1');
            const publicDir = join(tmp, 'public');
            // mkdir -p
            execFileSync('mkdir', ['-p', issuesDir, publicDir]);
            writeFileSync(
                join(publicDir, 'issues_full.json'),
                JSON.stringify([{
                    issue: 1,
                    year: 1980,
                    articles: [{ name: 'Test Subject', readingUrl: 'issues/1/1.ReadingView.html' }],
                }]),
            );
            writeFileSync(
                join(issuesDir, '1.ReadingView.html'),
                '<html><head><title>x</title></head><body><p>Hello <b>world</b> from <script>alert(1)</script>Cinefex</p></body></html>',
            );

            execFileSync('node', [SCRIPT], {
                env: {
                    ...process.env,
                    ISSUES_BASE_DIR: join(tmp, 'issues'),
                    PUBLIC_DIR: publicDir,
                    FORCE: '1',
                },
                stdio: 'pipe',
            });

            const payload = JSON.parse(readFileSync(join(publicDir, 'search_index.json'), 'utf-8'));
            assert.equal(payload.version, 1);
            assert.equal(typeof payload.generatedAt, 'string');
            assert.equal(payload.documentCount, 1);
            assert.equal(payload.documents.length, 1);
            assert.equal(payload.documents[0].id, '1/0');
            assert.equal(payload.documents[0].name, 'Test Subject');
            // The <title> element is not in our skip-tag list, so its text
            // ("x") ends up in the output alongside the body. The important
            // contract is that <script> contents (alert(1)) are dropped.
            assert.match(payload.documents[0].text, /Hello\s+world\s+from/);
            assert.match(payload.documents[0].text, /Cinefex/);
            assert.equal(payload.documents[0].text.includes('alert'), false);
            assert.equal(payload.documents[0].text.includes('(1)'), false);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('skips rebuild when the output is newer than every input (idempotent)', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'bsi-'));
        try {
            const issuesDir = join(tmp, 'issues', '1');
            const publicDir = join(tmp, 'public');
            execFileSync('mkdir', ['-p', issuesDir, publicDir]);
            writeFileSync(join(publicDir, 'issues_full.json'), JSON.stringify([{ issue: 1, year: 1980, articles: [{ name: 'X', readingUrl: 'issues/1/1.ReadingView.html' }] }]));
            writeFileSync(join(issuesDir, '1.ReadingView.html'), '<html><body><p>One</p></body></html>');

            // First run: build.
            const out1 = execFileSync('node', [SCRIPT], {
                env: { ...process.env, ISSUES_BASE_DIR: join(tmp, 'issues'), PUBLIC_DIR: publicDir, FORCE: '1' },
            }).toString();
            assert.match(out1, /documents/);

            // Second run: should skip.
            const out2 = execFileSync('node', [SCRIPT], {
                env: { ...process.env, ISSUES_BASE_DIR: join(tmp, 'issues'), PUBLIC_DIR: publicDir },
            }).toString();
            assert.match(out2, /up to date/);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    it('parses HTML entities in names and titles', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'bsi-'));
        try {
            const issuesDir = join(tmp, 'issues', '1');
            const publicDir = join(tmp, 'public');
            execFileSync('mkdir', ['-p', issuesDir, publicDir]);
            writeFileSync(
                join(publicDir, 'issues_full.json'),
                JSON.stringify([{ issue: 1, year: 1980, articles: [{ name: 'Star Trek &amp; Co.', articleTitle: 'Into the V&#x2019;ger Maw', readingUrl: 'issues/1/1.ReadingView.html' }] }]),
            );
            writeFileSync(join(issuesDir, '1.ReadingView.html'), '<html><body><p>Test</p></body></html>');

            execFileSync('node', [SCRIPT], {
                env: { ...process.env, ISSUES_BASE_DIR: join(tmp, 'issues'), PUBLIC_DIR: publicDir, FORCE: '1' },
                stdio: 'pipe',
            });

            const payload = JSON.parse(readFileSync(join(publicDir, 'search_index.json'), 'utf-8'));
            assert.equal(payload.documents[0].name, 'Star Trek & Co.');
            assert.equal(payload.documents[0].articleTitle, "Into the V\u2019ger Maw");
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});
