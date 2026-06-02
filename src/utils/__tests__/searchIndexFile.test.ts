import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SearchIndexPayload } from '../searchIndex';

describe('search_index.json on disk', () => {
    let payload: SearchIndexPayload;

    beforeAll(() => {
        // Run from the repo root. The file is gitignored; we only check
        // it when present (i.e. the build step has run at least once).
        const file = path.resolve(process.cwd(), 'public', 'search_index.json');
        if (!fs.existsSync(file)) {
            // Skip silently — this test is a build-time invariant, not a
            // contract for every dev environment.
            return;
        }
        payload = JSON.parse(fs.readFileSync(file, 'utf-8')) as SearchIndexPayload;
    });

    it('has the expected top-level shape', () => {
        if (!payload) return;
        expect(payload.version).toBe(1);
        expect(typeof payload.generatedAt).toBe('string');
        expect(payload.documentCount).toBe(payload.documents.length);
        expect(payload.documents.length).toBeGreaterThan(100); // 169 issues × 3+ articles
    });

    it('every document has a unique canonical id "<issue>/<articleIndex>"', () => {
        if (!payload) return;
        const ids = new Set<string>();
        for (const d of payload.documents) {
            expect(d.id).toBe(`${d.issue}/${d.articleIndex}`);
            expect(ids.has(d.id)).toBe(false);
            ids.add(d.id);
        }
    });

    it('every document has non-empty searchable text', () => {
        if (!payload) return;
        const empty = payload.documents.filter((d) => !d.text || !d.text.trim());
        expect(empty.length).toBe(0);
    });

    it('text length is bounded by the configured cap', () => {
        if (!payload) return;
        const cap = payload.maxCharsPerDoc;
        for (const d of payload.documents) {
            expect(d.text.length).toBeLessThanOrEqual(cap);
        }
    });

    it('articles contain distinctive Cinefex terms that are searchable', () => {
        if (!payload) return;
        // Sanity check: at least one document should mention "stunt" (a VFX term)
        // and one should mention "Cinefex" (the magazine name).
        const hasStunt = payload.documents.some((d) => /stunt/i.test(d.text));
        const hasCinefex = payload.documents.some((d) => /cinefex/i.test(d.text));
        expect(hasStunt).toBe(true);
        expect(hasCinefex).toBe(true);
    });
});
