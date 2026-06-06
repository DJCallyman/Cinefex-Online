"""Unit tests for clean_article_title in create_json.py.

Run directly:  python3 create_json_test.py
"""

import sys
import unittest
from pathlib import Path

# Make create_json.py importable when run from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from create_json import clean_article_title  # noqa: E402


class CleanArticleTitleTests(unittest.TestCase):
    def test_missing_inputs_return_none(self):
        self.assertIsNone(clean_article_title(None, 'X'))
        self.assertIsNone(clean_article_title('X', None))
        self.assertIsNone(clean_article_title(None, None))
        self.assertIsNone(clean_article_title('', 'X'))
        self.assertIsNone(clean_article_title('X', ''))
        self.assertIsNone(clean_article_title('   ', 'X'))
        self.assertIsNone(clean_article_title('X', '   '))

    def test_exact_match_drops_title(self):
        self.assertIsNone(clean_article_title('Brainstorm', 'Brainstorm'))
        # case-insensitive
        self.assertIsNone(clean_article_title('BRAINSTORM', 'brainstorm'))
        # whitespace-tolerant
        self.assertIsNone(clean_article_title('  Brainstorm  ', 'Brainstorm'))

    def test_hyphen_prefix_is_stripped(self):
        self.assertEqual(
            clean_article_title('Brainstorm - Getting the Cookie at the End', 'Brainstorm'),
            'Getting the Cookie at the End',
        )

    def test_em_dash_prefix_is_stripped(self):
        self.assertEqual(
            clean_article_title('Brainstorm — Getting the Cookie at the End', 'Brainstorm'),
            'Getting the Cookie at the End',
        )

    def test_en_dash_prefix_is_stripped(self):
        self.assertEqual(
            clean_article_title("Willis O'Brien – Creator of the Impossible", "Willis O'Brien"),
            'Creator of the Impossible',
        )

    def test_colon_prefix_is_stripped(self):
        self.assertEqual(
            clean_article_title('Blade Runner: 2020 Foresight', 'Blade Runner'),
            '2020 Foresight',
        )

    def test_trailing_subject_left_intact(self):
        # These are titles from the 127+ issues where the subject
        # appears at the end of the title as part of a longer phrase
        # ("X of Y", "X on Y", "X Papers", etc.). Stripping the
        # subject would leave a meaningless suffix.
        self.assertEqual(
            clean_article_title('The Effects of Beetlejuice', 'Beetlejuice'),
            'The Effects of Beetlejuice',
        )
        self.assertEqual(
            clean_article_title('The Fly Papers', 'The Fly'),
            'The Fly Papers',
        )
        self.assertEqual(
            clean_article_title('Dancing on the Edge of the Abyss', 'The Abyss'),
            'Dancing on the Edge of the Abyss',
        )
        self.assertEqual(
            clean_article_title('Visions of the Hereafter', 'Hereafter'),
            'Visions of the Hereafter',
        )
        self.assertEqual(
            clean_article_title(
                'The Microcosmic World Of Ken Middleham',
                'Ken Middleham',
            ),
            'The Microcosmic World Of Ken Middleham',
        )
        self.assertEqual(
            clean_article_title('Mach 5 Effects - The Apogee of Firefox', 'Firefox'),
            'Mach 5 Effects - The Apogee of Firefox',
        )
        self.assertEqual(
            clean_article_title('Aging Gracefully with Dick Smith', 'Dick Smith'),
            'Aging Gracefully with Dick Smith',
        )
        self.assertEqual(
            clean_article_title('From The Mouth Of Babe', 'Babe'),
            'From The Mouth Of Babe',
        )
        self.assertEqual(
            clean_article_title(
                'The Altered States of Altered States',
                'Altered States',
            ),
            'The Altered States of Altered States',
        )

    def test_person_on_subject_left_intact(self):
        # "<person> on <subject>" titles in the 127+ issues. The
        # "on <subject>" suffix is part of the meaning ("an interview
        # with X about Y"), not a duplication, so we leave the whole
        # title alone.
        self.assertEqual(
            clean_article_title('John Sullivan on Next', 'Next'),
            'John Sullivan on Next',
        )
        self.assertEqual(
            clean_article_title('Chas Jarrett on Sweeney Todd', 'Sweeney Todd'),
            'Chas Jarrett on Sweeney Todd',
        )
        self.assertEqual(
            clean_article_title('Joe Bauer on Get Smart', 'Get Smart'),
            'Joe Bauer on Get Smart',
        )
        self.assertEqual(
            clean_article_title(
                'Joel Hynek & Kevin Elam on Jumper',
                'Jumper',
            ),
            'Joel Hynek & Kevin Elam on Jumper',
        )

    def test_trailing_separators_trimmed(self):
        # When the leading prefix is the entire title, the strip
        # leaves only the separator characters; we trim those and
        # return None.
        self.assertIsNone(clean_article_title('Outland,', 'Outland'))
        self.assertIsNone(clean_article_title('Outland: — ', 'Outland'))
        # But trailing separators in a SUBSTANTIVE title are NOT
        # stripped away (we only strip from both ends of a result that
        # still has meaningful content).
        self.assertEqual(
            clean_article_title('Beetlejuice: ', 'Beetlejuice'),
            None,  # 'Beetlejuice: ' → strip "Beetlejuice:" → "" → None
        )

    def test_clean_title_unchanged(self):
        self.assertEqual(
            clean_article_title(
                "Into the V'ger Maw with Douglas Trumbull",
                'Star Trek: The Motion Picture',
            ),
            "Into the V'ger Maw with Douglas Trumbull",
        )

    def test_extra_whitespace_collapsed(self):
        self.assertEqual(
            clean_article_title('Brainstorm   —   Getting the Cookie at the End', 'Brainstorm'),
            'Getting the Cookie at the End',
        )

    def test_stripping_subject_leaves_subject_returns_none(self):
        # After stripping, only the subject remains
        self.assertIsNone(clean_article_title('Alien - Alien', 'Alien'))


if __name__ == '__main__':
    unittest.main()
