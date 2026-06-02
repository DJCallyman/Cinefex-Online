import { describe, it, expect } from 'vitest';
import { extractSnippet } from '../searchIndex';

describe('extractSnippet', () => {
    it('returns empty string for empty text', () => {
        expect(extractSnippet('', [])).toBe('');
        expect(extractSnippet('', ['foo'])).toBe('');
    });

    it('returns a 120-char window from the start when no terms', () => {
        const text = 'a'.repeat(500);
        const out = extractSnippet(text, []);
        expect(out.length).toBe(120);
        expect(out).toBe('a'.repeat(120));
    });

    it('centers the snippet around the first matched term', () => {
        const before = 'a'.repeat(100);
        const match = 'MATCH';
        const after = 'b'.repeat(200);
        const text = before + match + after;
        const out = extractSnippet(text, [match.toLowerCase()]);
        expect(out).toContain('MATCH');
    });

    it('prefers the earliest occurrence across multiple terms', () => {
        const text = 'lorem ipsum dolor sit amet';
        // 'foo' is not in the text, 'dolor' is at position 12
        const out = extractSnippet(text, ['foo', 'dolor']);
        expect(out).toContain('dolor');
    });

    it('does not start with an ellipsis when the match is at position 0', () => {
        const text = 'MATCH' + 'b'.repeat(200);
        const out = extractSnippet(text, ['MATCH']);
        expect(out.startsWith('MATCH')).toBe(true);
    });

    it('appends a trailing ellipsis when the snippet is clipped at the end', () => {
        const text = 'a'.repeat(100) + 'MATCH' + 'b'.repeat(200);
        const out = extractSnippet(text, ['MATCH']);
        expect(out.endsWith('…')).toBe(true);
    });

    it('falls back gracefully when no term appears in the text', () => {
        const out = extractSnippet('hello world', ['xyz']);
        expect(out).toBe('hello world');
    });

    it('is case-insensitive', () => {
        const out = extractSnippet('Hello World', ['HELLO']);
        expect(out).toContain('Hello');
    });

    it('skips empty terms', () => {
        const out = extractSnippet('hello world', ['', 'world']);
        expect(out).toContain('world');
    });
});
