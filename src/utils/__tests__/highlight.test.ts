import { describe, it, expect } from 'vitest';
import { highlight } from '../highlight';

describe('highlight', () => {
    it('returns escaped text when query is empty', () => {
        expect(highlight('Hello', '')).toBe('Hello');
        expect(highlight('Hello', '   ')).toBe('Hello');
    });

    it('returns empty string for empty input', () => {
        expect(highlight('', 'foo')).toBe('');
    });

    it('wraps case-insensitive matches in <mark>', () => {
        expect(highlight('The Empire Strikes Back', 'empire')).toBe(
            'The <mark>Empire</mark> Strikes Back',
        );
    });

    it('wraps all occurrences', () => {
        expect(highlight('foo bar foo', 'foo')).toBe('<mark>foo</mark> bar <mark>foo</mark>');
    });

    it('escapes HTML in the source text', () => {
        expect(highlight('A & B <C>', 'A')).toBe('<mark>A</mark> &amp; B &lt;C&gt;');
    });

    it('escapes HTML in the query', () => {
        // The query "<script>" gets escaped to "&lt;script&gt;" before searching,
        // which doesn't appear in "hello world" so nothing is highlighted, and
        // importantly the original "<script>" string is not injected into output.
        const result = highlight('hello world', '<script>');
        expect(result).toBe('hello world');
        expect(result).not.toContain('<script>');
    });

    it('escapes regex metacharacters in the query', () => {
        // Source is escaped first; then we look for the literal "." in the
        // escaped source ("a.b.c" has no entities), so only the dots match.
        expect(highlight('a.b.c', '.')).toBe('a<mark>.</mark>b<mark>.</mark>c');
    });

    it('preserves original casing inside the <mark>', () => {
        expect(highlight('Jurassic Park', 'park')).toBe('Jurassic <mark>Park</mark>');
        expect(highlight('JURASSIC PARK', 'park')).toBe('JURASSIC <mark>PARK</mark>');
    });

    it('returns unchanged text when no match', () => {
        expect(highlight('Hello', 'xyz')).toBe('Hello');
    });
});
