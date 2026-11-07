"""palette.py: reads the drawing colours from tokens.css, and says clearly when it can't."""
import pytest

import palette
from palette import PaletteError, read_tokens, solid


def test_real_tokens_are_solid_hex():
    for name in ('TOP', 'LEFT', 'RIGHT', 'EDGE', 'AMBER', 'SKY', 'PAGE'):
        v = getattr(palette, name)
        assert len(v) == 7 and v.startswith('#') and v == v.upper()


def test_short_hex_expands():
    assert solid('a', '#abc') == '#AABBCC'
    assert solid('a', '#0e1a27') == '#0E1A27'


@pytest.mark.parametrize('value', ['oklch(0.5 0.1 250)', 'var(--c-bg)', '#0E1A27CC', '#ABCD', '#12345', 'red'])
def test_unsupported_formats_name_the_token(value):
    with pytest.raises(PaletteError, match=r'--iso-top .*#RGB or #RRGGBB'):
        solid('iso-top', value)


def test_missing_token_is_named():
    with pytest.raises(PaletteError, match='--no-such-token'):
        palette.tok('no-such-token')


def test_root_found_without_a_space_and_not_inside_media():
    css = '''/* :root { --a: #111; } */
@media (min-width: 40em) { :root { --a: #222; } }
:root{--a:#333;--b: #444 }
@media print { :root { --b: #555; } }'''
    assert read_tokens(css) == {'a': '#333', 'b': '#444'}


def test_no_root_block():
    with pytest.raises(PaletteError, match='no top-level :root'):
        read_tokens('@media print { :root { --a: #fff; } }')
