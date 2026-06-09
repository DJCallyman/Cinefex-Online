import { describe, it, expect } from 'vitest';
import { displayTitle } from '../articleDisplay';
import { cleanArticleTitle } from '../cleanArticleTitle';

describe('displayTitle (React wrapper)', () => {
    it('returns null when either input is missing', () => {
        expect(displayTitle('', 'Whatever')).toBeNull();
        expect(displayTitle('Brainstorm', '')).toBeNull();
        expect(displayTitle('Brainstorm', undefined)).toBeNull();
        expect(displayTitle('', '')).toBeNull();
        expect(displayTitle('Brainstorm', '   ')).toBeNull();
    });

    it('returns null when the title equals the subject (case-insensitive)', () => {
        expect(displayTitle('Brainstorm', 'Brainstorm')).toBeNull();
        expect(displayTitle('Brainstorm', 'BRAINSTORM')).toBeNull();
        expect(displayTitle('Brainstorm', '  Brainstorm  ')).toBeNull();
    });

    it('strips a hyphen-prefixed subject', () => {
        expect(
            displayTitle('Brainstorm', 'Brainstorm - Getting the Cookie at the End'),
        ).toBe('Getting the Cookie at the End');
    });

    it('strips an em-dash-prefixed subject', () => {
        expect(
            displayTitle('Brainstorm', 'Brainstorm — Getting the Cookie at the End'),
        ).toBe('Getting the Cookie at the End');
    });

    it('strips an en-dash-prefixed subject', () => {
        expect(
            displayTitle("Willis O'Brien", "Willis O'Brien – Creator of the Impossible"),
        ).toBe('Creator of the Impossible');
    });

    it('strips a colon-prefixed subject', () => {
        expect(displayTitle('Blade Runner', 'Blade Runner: 2020 Foresight')).toBe('2020 Foresight');
    });

    it('leaves a trailing subject intact', () => {
        // "X of Y", "X on Y", "X Papers" — the subject is part of a
        // larger phrase, not a duplicated prefix.
        expect(displayTitle('Beetlejuice', 'The Effects of Beetlejuice')).toBe('The Effects of Beetlejuice');
        expect(displayTitle('The Fly', 'The Fly Papers')).toBe('The Fly Papers');
        expect(displayTitle('The Abyss', 'Dancing on the Edge of the Abyss')).toBe('Dancing on the Edge of the Abyss');
        expect(displayTitle('Hereafter', 'Visions of the Hereafter')).toBe('Visions of the Hereafter');
        expect(displayTitle('Firefox', 'Mach 5 Effects - The Apogee of Firefox')).toBe('Mach 5 Effects - The Apogee of Firefox');
        expect(displayTitle('Dick Smith', 'Aging Gracefully with Dick Smith')).toBe('Aging Gracefully with Dick Smith');
        expect(displayTitle('Babe', 'From The Mouth Of Babe')).toBe('From The Mouth Of Babe');
        expect(displayTitle('Ken Middleham', 'The Microcosmic World Of Ken Middleham')).toBe('The Microcosmic World Of Ken Middleham');
        expect(displayTitle('Altered States', 'The Altered States of Altered States')).toBe('The Altered States of Altered States');
    });

    it('leaves "<person> on <subject>" titles intact', () => {
        expect(displayTitle('Next', 'John Sullivan on Next')).toBe('John Sullivan on Next');
        expect(displayTitle('Sweeney Todd', 'Chas Jarrett on Sweeney Todd')).toBe('Chas Jarrett on Sweeney Todd');
        expect(displayTitle('Jumper', 'Joel Hynek & Kevin Elam on Jumper')).toBe('Joel Hynek & Kevin Elam on Jumper');
    });

    it('drops the title when only the subject + separator remain at the start', () => {
        expect(displayTitle('Outland', 'Outland,')).toBeNull();
        expect(displayTitle('Outland', 'Outland: — ')).toBeNull();
    });

    it('leaves a clean title unchanged', () => {
        expect(
            displayTitle(
                'Star Trek: The Motion Picture',
                "Into the V'ger Maw with Douglas Trumbull",
            ),
        ).toBe("Into the V'ger Maw with Douglas Trumbull");
    });

    it('collapses extra whitespace in the cleaned result', () => {
        expect(
            displayTitle('Brainstorm', 'Brainstorm   —   Getting the Cookie at the End'),
        ).toBe('Getting the Cookie at the End');
    });

    it('returns null when stripping leaves only the subject', () => {
        expect(displayTitle('Alien', 'Alien - Alien')).toBeNull();
    });

    it('does not strip a subject that is only a prefix of a longer word', () => {
        // "Tron" inside "Tronic" must NOT be stripped — that would
        // leave "ic Imagery". The cleaner requires an explicit
        // separator after the subject.
        expect(displayTitle('Tron', 'Tronic Imagery')).toBe('Tronic Imagery');
        expect(displayTitle('Alien', 'Aliens')).toBe('Aliens');
        expect(displayTitle('Alien', 'Alienware')).toBe('Alienware');
    });
});

// The build-time search-index generator (scripts/build-search-index.mjs)
// imports cleanArticleTitle directly. It must produce the same results
// as the React wrapper above; otherwise the runtime search snippets would
// disagree with what the modal renders.
describe('cleanArticleTitle (build-time, used by build-search-index.mjs)', () => {
    it('matches displayTitle for the canonical cases', () => {
        const cases: Array<[string, string, string | null]> = [
            ['Brainstorm', 'Brainstorm - Getting the Cookie at the End', 'Getting the Cookie at the End'],
            ['Brainstorm', 'Brainstorm — Getting the Cookie at the End', 'Getting the Cookie at the End'],
            ['Blade Runner', 'Blade Runner: 2020 Foresight', '2020 Foresight'],
            ['Beetlejuice', 'The Effects of Beetlejuice', 'The Effects of Beetlejuice'],
            ['The Abyss', 'Dancing on the Edge of the Abyss', 'Dancing on the Edge of the Abyss'],
            ['Tron', 'Tronic Imagery', 'Tronic Imagery'],
            ['Outland', 'Outland,', null],
            ['Alien', 'Alien - Alien', null],
            ['Star Trek: The Motion Picture', "Into the V'ger Maw with Douglas Trumbull", "Into the V'ger Maw with Douglas Trumbull"],
        ];
        for (const [subject, title, expected] of cases) {
            expect(cleanArticleTitle(subject, title)).toBe(expected);
        }
    });

    it('returns null on empty inputs', () => {
        expect(cleanArticleTitle('', 'Whatever')).toBeNull();
        expect(cleanArticleTitle('Brainstorm', '')).toBeNull();
        expect(cleanArticleTitle('Brainstorm', '   ')).toBeNull();
    });
});
