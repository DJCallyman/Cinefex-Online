#!/usr/bin/env node
/**
 * convert-covers-to-webp.js
 *
 * Build-time helper: convert every covers/N/cover512.jpg to a sibling
 * covers/N/cover512.webp using the system `cwebp` binary (part of the
 * `webp` Homebrew package; preinstalled on most macOS dev boxes).
 *
 * Why: the Cover <picture> element prefers the WebP source when present.
 * Browsers that support WebP get ~30% smaller downloads; older browsers
 * silently fall back to the JPEG. Without the .webp files, all browsers
 * just download the JPEG.
 *
 * Idempotent: skips files that are already newer than their JPEG.
 *
 * Usage:
 *   node scripts/convert-covers-to-webp.js                 # convert all
 *   node scripts/convert-covers-to-webp.js 1 50 167        # convert specific issues
 *   node scripts/convert-covers-to-webp.js --check         # exit 0 if up to date
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVERS_DIR = path.resolve(__dirname, '..', 'covers');

const CWEBP = 'cwebp';

function runCwebp(input, output) {
    // -q 82 is a good perceptual-quality/size sweet spot for cover images
    const result = spawnSync(CWEBP, ['-q', '82', input, '-o', output], {
        stdio: ['ignore', 'inherit', 'inherit'],
    });
    return result.status === 0;
}

function listIssueNumbers(args) {
    if (args.length > 0) {
        return args
            .map((a) => parseInt(a, 10))
            .filter((n) => Number.isFinite(n) && n > 0);
    }
    if (!fs.existsSync(COVERS_DIR)) return [];
    return fs
        .readdirSync(COVERS_DIR)
        .map((n) => parseInt(n, 10))
        .filter((n) => Number.isFinite(n) && fs.statSync(path.join(COVERS_DIR, String(n))).isDirectory())
        .sort((a, b) => a - b);
}

function needsConversion(jpgPath, webpPath) {
    if (!fs.existsSync(jpgPath)) return false;
    if (!fs.existsSync(webpPath)) return true;
    return fs.statSync(jpgPath).mtimeMs > fs.statSync(webpPath).mtimeMs;
}

function main() {
    const args = process.argv.slice(2);
    const checkOnly = args.includes('--check');
    const issueArgs = args.filter((a) => !a.startsWith('--'));
    const issues = listIssueNumbers(issueArgs);

    if (issues.length === 0) {
        console.log('No issue directories found in', COVERS_DIR);
        return;
    }

    let converted = 0;
    let skipped = 0;
    let missing = 0;
    let failed = 0;

    for (const n of issues) {
        const dir = path.join(COVERS_DIR, String(n));
        const jpg = path.join(dir, 'cover512.jpg');
        const webp = path.join(dir, 'cover512.webp');

        if (!fs.existsSync(jpg)) {
            missing++;
            continue;
        }
        if (!needsConversion(jpg, webp)) {
            skipped++;
            continue;
        }

        if (checkOnly) {
            console.log(`  issue ${n}: needs conversion`);
            converted++;
            continue;
        }

        if (runCwebp(jpg, webp)) {
            converted++;
        } else {
            failed++;
            console.error(`  issue ${n}: cwebp failed`);
        }
    }

    if (checkOnly) {
        if (converted > 0) {
            console.log(`\n${converted} cover(s) need conversion. Run without --check to update.`);
            process.exit(1);
        } else {
            console.log(`All ${skipped} cover(s) up to date.`);
            return;
        }
    }

    console.log(`\nDone. Converted: ${converted}, skipped: ${skipped}, missing: ${missing}, failed: ${failed}`);
    if (failed > 0) process.exit(1);
}

main();
