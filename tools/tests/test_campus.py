"""gen_campus.py: the footer's campus map is decoration on every page, so a screen reader skips it (review M6).
The footer's own words (the sections and the HUD's spot names) say what the map shows; the map itself has nothing to
add, and 'Map of the Uplink campus ...' read out on every page was noise."""
import pathlib

from lxml import etree

import gen_campus

SVG = '{http://www.w3.org/2000/svg}'
SPOKEN = ('role', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-roledescription')


def check(root):
    assert root.get('aria-hidden') == 'true'
    assert [a for a in SPOKEN if root.get(a) is not None] == []
    assert [e.tag for e in root.iter(SVG + 'title', SVG + 'desc')] == []        # no name a reader could still find
    assert [e.tag for e in root.iter() if e is not root and e.get('aria-hidden') == 'false'] == []
    assert root.get('focusable') in (None, 'false')


def test_the_map_is_hidden_from_screen_readers():
    check(etree.fromstring(gen_campus.build().encode()))


def test_the_committed_map_is_too():
    path = pathlib.Path(__file__).resolve().parents[2] / 'public/assets/img/campus.svg'
    check(etree.fromstring(path.read_bytes()))
