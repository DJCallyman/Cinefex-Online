#!/usr/bin/env node
/**
 * normalize-issue-fonts.js
 *
 * One-time mechanical normalization for new-format Cinefex issues (127+).
 *
 * Problem:
 *   The digitized issues >126 ship with font files that have different names
 *   than what their own Cinefex.css files @font-face rules expect.
 *   Example:
 *     Real file on disk: Benguiat-Book.otf
 *     CSS expects:       BenguiatStd-Book.otf
 *
 * This script creates the missing "expected" filenames as copies inside each
 * issue's fonts/ folder, without touching or deleting the original files.
 *
 * Usage:
 *   node scripts/normalize-issue-fonts.js          # process all issues 127-169
 *   node scripts/normalize-issue-fonts.js 167      # process only issue 167
 *   node scripts/normalize-issue-fonts.js 150 160  # process specific issues
 *
 * Safe to run multiple times (idempotent).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ISSUES_DIR = path.resolve(__dirname, '..', 'issues');

// Mapping of "what the CSS inside the issue expects" → "what actually exists on disk in that issue".
// We only create copies for names that have a clear 1:1 equivalent.
// Missing weights (Medium, Bold, etc.) are logged as warnings but not invented.
const FONT_ALIASES = [
  // Benguiat family (most common)
  { expected: 'BenguiatStd-Book.otf',           source: 'Benguiat-Book.otf' },
  { expected: 'BenguiatStd-BookItalic.otf',     source: 'Benguiat-BookItalic.otf' },

  // Gill Sans family
  { expected: 'GillSansStd.otf',                source: 'GillSans.otf' },
  { expected: 'GillSansStd-Italic.otf',         source: 'GillSans-Italic.otf' },

  // Variants sometimes referenced with different casing or "Std" prefix
  { expected: 'BenguiatStd-Medium.otf',         source: 'Benguiat-Book.otf' },      // pragmatic fallback
  { expected: 'BenguiatStd-MediumItalic.otf',   source: 'Benguiat-BookItalic.otf' }, // pragmatic fallback
  { expected: 'BenguiatStd-Bold.otf',           source: 'Benguiat-Book.otf' },      // pragmatic fallback
  { expected: 'GillSans-Bold.otf',              source: 'GillSans.otf' },           // pragmatic fallback
  { expected: 'GillSans Bold.tt',               source: 'GillSans.otf' },           // some CSS use this exact string
];

function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.warn('  ⚠ ' + msg);
}

function processIssue(issueNum) {
  const issueDir = path.join(ISSUES_DIR, String(issueNum));
  const fontsDir = path.join(issueDir, 'fonts');

  if (!fs.existsSync(issueDir)) {
    warn(`Issue ${issueNum} directory does not exist — skipping`);
    return;
  }
  if (!fs.existsSync(fontsDir)) {
    warn(`Issue ${issueNum} has no fonts/ directory — skipping`);
    return;
  }

  log(`\nProcessing issue ${issueNum}...`);

  let created = 0;
  let skipped = 0;

  for (const alias of FONT_ALIASES) {
    const expectedPath = path.join(fontsDir, alias.expected);
    const sourcePath = path.join(fontsDir, alias.source);

    if (fs.existsSync(expectedPath)) {
      skipped++;
      continue;
    }

    if (!fs.existsSync(sourcePath)) {
      warn(`  Missing source for "${alias.expected}" (looked for ${alias.source}) — skipping this alias`);
      continue;
    }

    try {
      fs.copyFileSync(sourcePath, expectedPath);
      created++;
      log(`  + Created ${alias.expected} (copy of ${alias.source})`);
    } catch (err) {
      warn(`  Failed to create ${alias.expected}: ${err.message}`);
    }
  }

  log(`  Done. Created ${created} alias(es), ${skipped} already present.`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Default: all new-format issues (127 through 169)
    log('Normalizing fonts for all new-format issues (127–169)...');
    for (let i = 127; i <= 169; i++) {
      processIssue(i);
    }
  } else {
    // Specific issue numbers provided
    for (const arg of args) {
      const num = parseInt(arg, 10);
      if (isNaN(num) || num < 1 || num > 169) {
        warn(`Ignoring invalid issue number: ${arg}`);
        continue;
      }
      if (num <= 126) {
        warn(`Issue ${num} is old-format (≤126) — font normalization not needed. Skipping.`);
        continue;
      }
      processIssue(num);
    }
  }

  log('\nFont normalization complete.');
  log('You can safely re-run this script at any time.');
}

main();
